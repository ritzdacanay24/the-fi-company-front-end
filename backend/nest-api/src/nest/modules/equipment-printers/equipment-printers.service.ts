import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseStringPromise } from 'xml2js';
import {
  EquipmentPrinterAlertSettings,
  EquipmentPrinterPayload,
  EquipmentPrintersRepository,
} from './equipment-printers.repository';

export interface ConsumableLevel {
  name: string;
  type: string;
  color?: string;
  levelPer?: number;
  levelState: string;
  forecastEndDate?: string;
}

export interface PrinterData {
  printerId: number;
  ipAddress: string;
  model: string;
  location?: string;
  status: 'online' | 'offline' | 'error';
  error?: string;
  lastSyncAt?: string;
  consumables: ConsumableLevel[];
  paperTrays?: {
    trayId: string;
    name: string;
    levelState: string;
    maxCapacity: number;
  }[];
  debug?: {
    requestUrl: string;
    sourceType?: 'json' | 'xml-legacy';
    sourceEndpoints?: string[];
    httpStatus?: number;
    hasMfp: boolean;
    rootKeys: string[];
    mfpKeys: string[];
    apiError?: string;
    sample?: string;
  };
}

export interface EquipmentPrinterAlertSettingsPayload {
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  cooldown_minutes: number;
  is_enabled: boolean;
}

@Injectable()
export class EquipmentPrintersService {
  private readonly logger = new Logger(EquipmentPrintersService.name);
  private readonly DEFAULT_DEVICE_ID = '_111_000_INF000';
  private readonly REQUEST_TIMEOUT_MS = 12000;
  private readonly RETRY_COUNT = 1;

  constructor(
    private readonly repository: EquipmentPrintersRepository,
    private readonly configService: ConfigService,
  ) {}

  async getAllPrinters() {
    return this.repository.getAllPrinters();
  }

  async getAlertSettings(): Promise<EquipmentPrinterAlertSettingsPayload> {
    const settings = await this.repository.getAlertSettings();
    if (!settings) {
      return {
        warning_threshold_percent: 25,
        critical_threshold_percent: 10,
        cooldown_minutes: 120,
        is_enabled: true,
      };
    }

    return this.mapAlertSettings(settings);
  }

  async updateAlertSettings(payload: Record<string, unknown>) {
    const normalized = this.normalizeAlertSettingsPayload(payload);
    await this.repository.upsertAlertSettings({
      warningThresholdPercent: normalized.warning_threshold_percent,
      criticalThresholdPercent: normalized.critical_threshold_percent,
      cooldownMinutes: normalized.cooldown_minutes,
      isEnabled: normalized.is_enabled,
    });

    return {
      message: 'Successfully Updated',
      settings: await this.getAlertSettings(),
    };
  }

  async createPrinter(payload: Record<string, unknown>) {
    const normalized = this.normalizePrinterPayload(payload, false);

    try {
      const id = await this.repository.createPrinter(normalized as EquipmentPrinterPayload);
      const printer = await this.repository.getPrinterById(id);

      return {
        message: 'Successfully Created',
        printer,
      };
    } catch (error) {
      this.handlePrinterMutationError(error);
      throw error;
    }
  }

  async updatePrinter(id: number, payload: Record<string, unknown>) {
    const existing = await this.repository.getPrinterById(id);
    if (!existing) {
      throw new NotFoundException(`Printer ${id} not found`);
    }

    const normalized = this.normalizePrinterPayload(payload, true);
    if (Object.keys(normalized).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    try {
      await this.repository.updatePrinterById(id, normalized);
      const printer = await this.repository.getPrinterById(id);

      return {
        message: 'Successfully Updated',
        printer,
      };
    } catch (error) {
      this.handlePrinterMutationError(error);
      throw error;
    }
  }

  async getAllPrintersStatus(): Promise<PrinterData[]> {
    const printersResult = await this.repository.getActivePrinters();
    const printers = Array.isArray(printersResult)
      ? printersResult
      : printersResult
        ? [printersResult as any]
        : [];

    if (printers.length === 0) {
      this.logger.warn('No active printers found in equipment_printers.');
      return [];
    }
    
    // Fetch data from all printers in parallel
    const results = await Promise.all(
      printers.map((printer) => this.fetchPrinterData(printer)),
    );

    return results;
  }

  private async fetchPrinterData(printer: any): Promise<PrinterData> {
    try {
      // Auto-obtain a fresh session: GET index.html issues an ID cookie with no credentials required.
      const sessionCookie = await this.getAutoSessionCookie(printer.ip_address);
      let data: any;
      let url: string;
      let sourceType: 'json' | 'xml-legacy';
      let sourceEndpoints: string[];
      let isXml = false;

      if (printer.api_type === 'xml') {
        const legacyXmlData = await this.fetchLegacyXmlData(printer.ip_address, sessionCookie);
        url = legacyXmlData.requestUrl;
        data = legacyXmlData.data;
        sourceType = 'xml-legacy';
        sourceEndpoints = legacyXmlData.sourceEndpoints;
        isXml = true;
      } else {
        const deviceId = printer.device_id || this.DEFAULT_DEVICE_ID;
        url = `http://${printer.ip_address}/wcd/api/AppReqGetCustomData/${deviceId}`;
        const response = await this.fetchWithTimeoutAndRetry(url, this.REQUEST_TIMEOUT_MS, this.RETRY_COUNT, sessionCookie);

        if (!response.ok) {
          const errorMsg = response.status === 404
            ? 'Printer API endpoint not available (unsupported printer model/firmware)'
            : `HTTP ${response.status}`;
          return this.createErrorResponse(printer, errorMsg);
        }

        data = await response.json();
        sourceType = 'json';
        sourceEndpoints = [url];
      }

      const debug = this.buildDebugInfo(url, 200, data, isXml, sourceType, sourceEndpoints);

      const rootApiError = data?.ErrorDetails || data?.ErrorDescription || data?.Result?.ResultInfo;
      if (rootApiError && !data?.MFP) {
        return this.createErrorResponse(printer, String(rootApiError), debug);
      }

      const mfp = data?.MFP;
      // Support JSON API shape and legacy XML shape.
      const consumableList =
        mfp?.ConsumableList ??
        mfp?.Output?.ConsumableList ??
        mfp?.DeviceInfo?.ConsumableList;
      const trayList =
        mfp?.Input?.TrayList ??
        mfp?.Output?.Input?.TrayList ??
        mfp?.DeviceInfo?.Input?.TrayList;

      if (consumableList || trayList) {
        const consumables = this.parseConsumables(consumableList);
        const paperTrays = this.parsePaperTrays(trayList);

        await this.repository.updateLastSync(printer.id);

        return {
          printerId: printer.id,
          ipAddress: printer.ip_address,
          model: printer.model,
          location: printer.location,
          status: 'online',
          lastSyncAt: new Date().toISOString(),
          consumables,
          paperTrays,
          debug,
        };
      }

      // Bubble up explicit device/API errors when available.
      const apiError = mfp?.Result?.ErrorDetails || mfp?.Result?.ResultInfo;
      if (apiError) {
        return this.createErrorResponse(printer, String(apiError), {
          ...debug,
          apiError: String(apiError),
        });
      }

      return this.createErrorResponse(printer, 'Invalid response format', debug);
    } catch (error) {
      this.logger.error(
        `Failed to fetch data from printer ${printer.ip_address}`,
        error,
      );
      return this.createErrorResponse(
        printer,
        this.formatFetchError(error),
        {
          requestUrl: `http://${printer.ip_address}/wcd/${printer.api_type === 'xml' ? 'consumable_list.xml + tray.xml' : `api/AppReqGetCustomData/${printer.device_id || this.DEFAULT_DEVICE_ID}`}`,
          hasMfp: false,
          rootKeys: [],
          mfpKeys: [],
          apiError: this.formatFetchError(error),
        },
      );
    }
  }

  private async fetchLegacyXmlData(
    ipAddress: string,
    sessionCookie: string,
  ): Promise<{ requestUrl: string; sourceEndpoints: string[]; data: any }> {
    const consumableUrl = `http://${ipAddress}/wcd/consumable_list.xml`;
    const trayUrl = `http://${ipAddress}/wcd/tray.xml`;

    const consumableResponse = await this.fetchWithTimeoutAndRetry(
      consumableUrl,
      this.REQUEST_TIMEOUT_MS,
      this.RETRY_COUNT,
      sessionCookie,
    );

    if (!consumableResponse.ok) {
      throw new Error(`Legacy XML consumable endpoint returned HTTP ${consumableResponse.status}`);
    }

    const consumableXml = this.normalizeXmlResponse(
      await parseStringPromise(await consumableResponse.text()),
    );

    let trayList: any;
    try {
      const trayResponse = await this.fetchWithTimeoutAndRetry(
        trayUrl,
        this.REQUEST_TIMEOUT_MS,
        this.RETRY_COUNT,
        sessionCookie,
      );

      if (trayResponse.ok) {
        const trayXml = this.normalizeXmlResponse(
          await parseStringPromise(await trayResponse.text()),
        );
        trayList = trayXml?.MFP?.DeviceInfo?.Input?.TrayList ?? trayXml?.DeviceInfo?.Input?.TrayList;
      }
    } catch {
      // Some legacy models may not expose tray.xml. We still return consumables.
      trayList = undefined;
    }

    return {
      requestUrl: `${consumableUrl} + ${trayUrl}`,
      sourceEndpoints: [consumableUrl, trayUrl],
      data: {
        MFP: {
          ConsumableList:
            consumableXml?.MFP?.DeviceInfo?.ConsumableList ??
            consumableXml?.MFP?.ConsumableList ??
            consumableXml?.DeviceInfo?.ConsumableList,
          Input: {
            TrayList: trayList,
          },
        },
      },
    };
  }

  private buildDebugInfo(
    url: string,
    httpStatus: number,
    data: any,
    isXml = false,
    sourceType?: 'json' | 'xml-legacy',
    sourceEndpoints?: string[],
  ): NonNullable<PrinterData['debug']> {
    const rootKeys = data && typeof data === 'object' ? Object.keys(data) : [];
    const mfp = data?.MFP;
    const mfpKeys = mfp && typeof mfp === 'object' ? Object.keys(mfp) : [];
    const apiError = data?.ErrorDetails || data?.ErrorDescription || data?.Result?.ResultInfo || mfp?.Result?.ErrorDetails || mfp?.Result?.ResultInfo;

    let sample = '';
    try {
      sample = JSON.stringify(data).replace(/"Token":"[^"]+"/g, '"Token":"[REDACTED]"').slice(0, 400);
    } catch {
      sample = '';
    }

    return {
      requestUrl: url,
      sourceType,
      sourceEndpoints,
      httpStatus,
      hasMfp: Boolean(mfp),
      rootKeys,
      mfpKeys,
      apiError: apiError ? String(apiError) : undefined,
      sample,
    };
  }

  private async fetchWithTimeoutAndRetry(
    url: string,
    timeoutMs: number,
    retryCount: number,
    cookieHeader = '',
  ): Promise<Response> {
    let lastError: unknown;

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        if (attempt < retryCount) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    throw lastError;
  }

  private async getAutoSessionCookie(ipAddress: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

      const response = await fetch(`http://${ipAddress}/wcd/index.html`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Printer issues a fresh ID session cookie in Set-Cookie on every index.html response.
      const setCookieHeader = response.headers.get('set-cookie') || '';
      const match = setCookieHeader.match(/ID=([^;]+)/);

      if (match) {
        this.logger.debug(`Auto-session obtained for ${ipAddress}: ID=${match[1].substring(0, 8)}...`);
        return `ID=${match[1]}`;
      }

      this.logger.warn(`No ID cookie returned from ${ipAddress}/wcd/index.html`);
      return '';
    } catch (error) {
      this.logger.warn(`Failed to get auto-session for ${ipAddress}: ${this.formatFetchError(error)}`);
      return '';
    }
  }

  private formatFetchError(error: unknown): string {
    if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'AbortError') {
      return `Request timeout after ${this.REQUEST_TIMEOUT_MS}ms`;
    }

    return error instanceof Error ? error.message : 'Unknown error';
  }

  private normalizePrinterPayload(
    payload: Record<string, unknown>,
    isUpdate: boolean,
  ): Partial<EquipmentPrinterPayload> {
    const normalized: Partial<EquipmentPrinterPayload> = {};

    const ipAddress = payload.ip_address ?? payload.ipAddress;
    if (!isUpdate || ipAddress !== undefined) {
      if (typeof ipAddress !== 'string' || !ipAddress.trim()) {
        throw new BadRequestException('ip_address is required and must be a non-empty string');
      }
      normalized.ip_address = ipAddress.trim();
    }

    const model = payload.model;
    if (!isUpdate || model !== undefined) {
      if (typeof model !== 'string' || !model.trim()) {
        throw new BadRequestException('model is required and must be a non-empty string');
      }
      normalized.model = model.trim();
    }

    const location = payload.location;
    if (location !== undefined) {
      if (location === null) {
        normalized.location = null;
      } else if (typeof location === 'string') {
        normalized.location = location.trim();
      } else {
        throw new BadRequestException('location must be a string or null');
      }
    }

    const deviceId = payload.device_id ?? payload.deviceId;
    if (deviceId !== undefined) {
      if (deviceId === null || deviceId === '') {
        normalized.device_id = null;
      } else if (typeof deviceId === 'string') {
        normalized.device_id = deviceId.trim();
      } else {
        throw new BadRequestException('device_id must be a string or null');
      }
    }

    const apiType = payload.api_type ?? payload.apiType;
    if (apiType !== undefined) {
      if (apiType !== 'json' && apiType !== 'xml') {
        throw new BadRequestException('api_type must be either json or xml');
      }
      normalized.api_type = apiType;
    }

    const active = payload.active;
    if (active !== undefined) {
      if (typeof active !== 'boolean') {
        throw new BadRequestException('active must be a boolean');
      }
      normalized.active = active;
    }

    const visibleInUi = payload.visible_in_ui ?? payload.visibleInUi;
    if (visibleInUi !== undefined) {
      if (typeof visibleInUi !== 'boolean') {
        throw new BadRequestException('visible_in_ui must be a boolean');
      }
      normalized.visible_in_ui = visibleInUi;
    }

    return normalized;
  }

  private handlePrinterMutationError(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'ER_DUP_ENTRY') {
      throw new ConflictException('Printer IP already exists');
    }

    throw error as Error;
  }

  private normalizeAlertSettingsPayload(
    payload: Record<string, unknown>,
  ): EquipmentPrinterAlertSettingsPayload {
    const warning = Number(payload.warning_threshold_percent ?? payload.warningThresholdPercent);
    const critical = Number(payload.critical_threshold_percent ?? payload.criticalThresholdPercent);
    const cooldown = Number(payload.cooldown_minutes ?? payload.cooldownMinutes);
    const isEnabledRaw = payload.is_enabled ?? payload.isEnabled;

    if (!Number.isFinite(warning) || warning < 0 || warning > 100) {
      throw new BadRequestException('warning_threshold_percent must be between 0 and 100');
    }

    if (!Number.isFinite(critical) || critical < 0 || critical > 100) {
      throw new BadRequestException('critical_threshold_percent must be between 0 and 100');
    }

    if (critical > warning) {
      throw new BadRequestException('critical_threshold_percent must be less than or equal to warning_threshold_percent');
    }

    if (!Number.isFinite(cooldown) || cooldown < 5 || cooldown > 1440) {
      throw new BadRequestException('cooldown_minutes must be between 5 and 1440');
    }

    if (typeof isEnabledRaw !== 'boolean') {
      throw new BadRequestException('is_enabled must be a boolean');
    }

    return {
      warning_threshold_percent: Math.round(warning),
      critical_threshold_percent: Math.round(critical),
      cooldown_minutes: Math.round(cooldown),
      is_enabled: isEnabledRaw,
    };
  }

  private mapAlertSettings(
    settings: EquipmentPrinterAlertSettings,
  ): EquipmentPrinterAlertSettingsPayload {
    return {
      warning_threshold_percent: Number(settings.warning_threshold_percent),
      critical_threshold_percent: Number(settings.critical_threshold_percent),
      cooldown_minutes: Number(settings.cooldown_minutes),
      is_enabled: Boolean(settings.is_enabled),
    };
  }

  private normalizeXmlResponse(xmlData: any): any {
    // Convert xml2js parsed XML to JSON structure matching the API response format
    // xml2js wraps all values in arrays, so we need to unwrap them
    const unwrapXmlValue = (val: any): any => {
      if (Array.isArray(val)) {
        return val.length === 1 ? unwrapXmlValue(val[0]) : val.map(unwrapXmlValue);
      }
      if (val && typeof val === 'object' && val !== null) {
        const unwrapped: any = {};
        for (const key in val) {
          if (key === '$') {
            // Attributes
            Object.assign(unwrapped, val[key]);
          } else if (key === '_') {
            // Text content
            return val[key];
          } else {
            unwrapped[key] = unwrapXmlValue(val[key]);
          }
        }
        return Object.keys(unwrapped).length > 0 ? unwrapped : val;
      }
      return val;
    };

    return unwrapXmlValue(xmlData);
  }

  private parseConsumables(consumableList: any): ConsumableLevel[] {
    const consumables: ConsumableLevel[] = [];

    if (!consumableList?.Consumable) {
      return consumables;
    }

    const items = Array.isArray(consumableList.Consumable)
      ? consumableList.Consumable
      : [consumableList.Consumable];

    items.forEach((item: any) => {
      consumables.push({
        name: item.Name || 'Unknown',
        type: item.Type || 'Unknown',
        color: item.Color,
        levelPer: item.CurrentLevel?.LevelPer
          ? parseInt(item.CurrentLevel.LevelPer)
          : undefined,
        levelState: item.CurrentLevel?.LevelState || 'Unknown',
        forecastEndDate: item.EndForecast
          ? `${item.EndForecast.Year}-${String(item.EndForecast.Month).padStart(2, '0')}-${String(item.EndForecast.Day).padStart(2, '0')}`
          : undefined,
      });
    });

    return consumables;
  }

  private parsePaperTrays(trayList: any): PrinterData['paperTrays'] {
    if (!trayList?.Tray) {
      return undefined;
    }

    const trays: PrinterData['paperTrays'] = [];
    const items = Array.isArray(trayList.Tray)
      ? trayList.Tray
      : [trayList.Tray];

    items.forEach((tray: any) => {
      trays.push({
        trayId: tray.TrayID || tray.OutputTrayID || 'Unknown',
        name: tray.Name || tray.TrayID || tray.OutputTrayID || 'Unknown',
        levelState: tray.CurrentLevel?.LevelState || tray.Status || 'Unknown',
        maxCapacity: parseInt(tray.MaxCapacity) || 0,
      });
    });

    return trays;
  }

  private createErrorResponse(
    printer: any,
    error: string,
    debug?: NonNullable<PrinterData['debug']>,
  ): PrinterData {
    return {
      printerId: printer.id,
      ipAddress: printer.ip_address,
      model: printer.model,
      location: printer.location,
      status: 'offline',
      error,
      consumables: [],
      paperTrays: [],
      debug,
    };
  }
}
