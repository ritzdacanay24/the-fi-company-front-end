import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {
  EquipmentPrinterAlertSettings,
  EquipmentPrintersService,
  PrinterConfig,
  PrinterConfigPayload,
  PrinterData,
} from '@app/core/api/equipment-printers/equipment-printers.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-equipment-status',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule],
  templateUrl: './equipment-status.component.html',
  styleUrls: ['./equipment-status.component.scss'],
})
export class EquipmentStatusComponent implements OnInit, OnDestroy {
  printers: PrinterData[] = [];
  printerConfigs: PrinterConfig[] = [];
  loading = true;
  loadingConfigs = false;
  error: string | null = null;
  configError: string | null = null;
  configSuccess: string | null = null;
  alertSettingsError: string | null = null;
  alertSettingsSaving = false;
  lastRefresh: Date | null = null;
  directPullResults: Record<string, string> = {};
  directPullLoading: Record<string, boolean> = {};

  isManageOpen = true;
  creatingPrinter = false;
  updatingPrinterId: number | null = null;
  editingPrinterId: number | null = null;

  createForm: {
    ip_address: string;
    model: string;
    location: string;
    device_id: string;
    api_type: 'json' | 'xml';
    active: boolean;
    visible_in_ui: boolean;
  } = {
    ip_address: '',
    model: '',
    location: '',
    device_id: '',
    api_type: 'json',
    active: true,
    visible_in_ui: true,
  };

  editForm: {
    ip_address: string;
    model: string;
    location: string;
    device_id: string;
    api_type: 'json' | 'xml';
    active: boolean;
    visible_in_ui: boolean;
  } = {
    ip_address: '',
    model: '',
    location: '',
    device_id: '',
    api_type: 'json',
    active: true,
    visible_in_ui: true,
  };

  alertSettingsForm: EquipmentPrinterAlertSettings = {
    warning_threshold_percent: 25,
    critical_threshold_percent: 10,
    cooldown_minutes: 120,
    is_enabled: true,
  };

  private destroy$ = new Subject<void>();
  private refreshInterval = 5 * 60 * 1000; // 5 minutes

  constructor(
    private equipmentService: EquipmentPrintersService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    // Initial load
    this.loadPrinters();
    this.loadPrinterConfigs();
    this.loadAlertSettings();

    // Auto-refresh every 5 minutes
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.equipmentService.getPrintersStatus()),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (data) => {
          this.printers = data;
          this.lastRefresh = new Date();
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          this.error = err?.message || 'Failed to load printer status';
          this.loading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPrinters(): void {
    this.loading = true;
    this.equipmentService.getPrintersStatus().subscribe({
      next: (data) => {
        this.printers = data;
        this.lastRefresh = new Date();
        this.loading = false;
        this.error = null;
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load printer status';
        this.loading = false;
      },
    });
  }

  private loadPrinterConfigs(): void {
    this.loadingConfigs = true;
    this.configError = null;

    this.equipmentService.getPrinters().subscribe({
      next: (data) => {
        this.printerConfigs = data;
        this.loadingConfigs = false;
      },
      error: (err) => {
        this.configError = err?.error?.message || err?.message || 'Failed to load printer configuration';
        this.loadingConfigs = false;
      },
    });
  }

  private loadAlertSettings(): void {
    this.equipmentService.getAlertSettings().subscribe({
      next: (data) => {
        this.alertSettingsForm = {
          warning_threshold_percent: data.warning_threshold_percent,
          critical_threshold_percent: data.critical_threshold_percent,
          cooldown_minutes: data.cooldown_minutes,
          is_enabled: data.is_enabled,
        };
      },
      error: () => {
        // Keep defaults if unavailable.
      },
    });
  }

  openAlertSettingsModal(content: any): void {
    this.alertSettingsError = null;
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
    });
  }

  saveAlertSettings(modal: any): void {
    this.alertSettingsError = null;

    if (this.alertSettingsForm.critical_threshold_percent > this.alertSettingsForm.warning_threshold_percent) {
      this.alertSettingsError = 'Critical threshold must be less than or equal to warning threshold.';
      return;
    }

    this.alertSettingsSaving = true;
    this.equipmentService.updateAlertSettings(this.alertSettingsForm).subscribe({
      next: (response) => {
        this.alertSettingsForm = response.settings;
        this.alertSettingsSaving = false;
        this.configSuccess = 'Alert settings updated successfully.';
        modal.close();
      },
      error: (err) => {
        this.alertSettingsError = err?.error?.message || err?.message || 'Failed to update alert settings';
        this.alertSettingsSaving = false;
      },
    });
  }

  toggleManagePanel(): void {
    this.isManageOpen = !this.isManageOpen;
  }

  createPrinter(): void {
    this.configError = null;
    this.configSuccess = null;

    const ipAddress = this.createForm.ip_address.trim();
    const model = this.createForm.model.trim();
    if (!ipAddress || !model) {
      this.configError = 'IP address and model are required.';
      return;
    }

    const payload: PrinterConfigPayload = {
      ip_address: ipAddress,
      model,
      location: this.coerceStringOrNull(this.createForm.location),
      device_id: this.coerceStringOrNull(this.createForm.device_id),
      api_type: this.createForm.api_type,
      active: this.createForm.active,
      visible_in_ui: this.createForm.visible_in_ui,
    };

    this.creatingPrinter = true;
    this.equipmentService.createPrinter(payload).subscribe({
      next: () => {
        this.configSuccess = 'Printer added successfully.';
        this.createForm = {
          ip_address: '',
          model: '',
          location: '',
          device_id: '',
          api_type: 'json',
          active: true,
          visible_in_ui: true,
        };
        this.creatingPrinter = false;
        this.loadPrinterConfigs();
        this.loadPrinters();
      },
      error: (err) => {
        this.configError = err?.error?.message || err?.message || 'Failed to add printer';
        this.creatingPrinter = false;
      },
    });
  }

  startEdit(printer: PrinterConfig): void {
    this.editingPrinterId = printer.id;
    this.configError = null;
    this.configSuccess = null;
    this.editForm = {
      ip_address: printer.ip_address || '',
      model: printer.model || '',
      location: printer.location || '',
      device_id: printer.device_id || '',
      api_type: printer.api_type === 'xml' ? 'xml' : 'json',
      active: this.isPrinterActive(printer),
      visible_in_ui: this.isPrinterVisible(printer),
    };
  }

  cancelEdit(): void {
    this.editingPrinterId = null;
  }

  saveEdit(printerId: number): void {
    this.configError = null;
    this.configSuccess = null;

    const ipAddress = this.editForm.ip_address.trim();
    const model = this.editForm.model.trim();
    if (!ipAddress || !model) {
      this.configError = 'IP address and model are required.';
      return;
    }

    const payload: PrinterConfigPayload = {
      ip_address: ipAddress,
      model,
      location: this.coerceStringOrNull(this.editForm.location),
      device_id: this.coerceStringOrNull(this.editForm.device_id),
      api_type: this.editForm.api_type,
      active: this.editForm.active,
      visible_in_ui: this.editForm.visible_in_ui,
    };

    this.updatingPrinterId = printerId;
    this.equipmentService.updatePrinter(printerId, payload).subscribe({
      next: () => {
        this.configSuccess = 'Printer updated successfully.';
        this.updatingPrinterId = null;
        this.editingPrinterId = null;
        this.loadPrinterConfigs();
        this.loadPrinters();
      },
      error: (err) => {
        this.configError = err?.error?.message || err?.message || 'Failed to update printer';
        this.updatingPrinterId = null;
      },
    });
  }

  isPrinterActive(printer: PrinterConfig): boolean {
    return printer.active === true || printer.active === 1;
  }

  isPrinterVisible(printer: PrinterConfig): boolean {
    return printer.visible_in_ui === true || printer.visible_in_ui === 1;
  }

  private coerceStringOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'online':
        return 'bg-success';
      case 'offline':
        return 'bg-danger';
      case 'error':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }

  getConsumableLevelClass(levelState: string): string {
    switch (levelState) {
      case 'Full':
        return 'bg-danger';
      case 'Empty':
        return 'bg-danger';
      case 'NearEmpty':
        return 'bg-warning';
      case 'Ready':
        return 'bg-success';
      default:
        return 'bg-info';
    }
  }

  getConsumableLevelPercentage(levelPer?: number): number {
    if (levelPer === undefined || levelPer === null) {
      return 0;
    }
    return Math.min(levelPer, 100);
  }

  getTrayLevelClass(levelState: string): string {
    switch (levelState) {
      case 'Empty':
        return 'text-danger';
      case 'NearEmpty':
        return 'text-warning';
      case 'Ready':
        return 'text-success';
      default:
        return 'text-info';
    }
  }

  getCriticalCount(printer: PrinterData): number {
    const consumableCritical = (printer.consumables || []).filter(
      (item) => item.levelState === 'Empty' || item.levelState === 'Full' || (item.levelPer ?? 101) <= 10,
    ).length;

    const trayCritical = (printer.paperTrays || []).filter(
      (tray) => tray.levelState === 'Empty',
    ).length;

    return consumableCritical + trayCritical;
  }

  getWarningCount(printer: PrinterData): number {
    const consumableWarning = (printer.consumables || []).filter(
      (item) => item.levelState === 'NearEmpty' || ((item.levelPer ?? 101) > 10 && (item.levelPer ?? 101) <= 25),
    ).length;

    const trayWarning = (printer.paperTrays || []).filter(
      (tray) => tray.levelState === 'NearEmpty',
    ).length;

    return consumableWarning + trayWarning;
  }

  getPrinterUiUrl(ipAddress: string): string {
    return `http://${ipAddress}`;
  }

  getTonerBarColor(color?: string): string {
    switch ((color || '').toLowerCase()) {
      case 'yellow':  return '#f5c400';
      case 'magenta': return '#e91e8c';
      case 'cyan':    return '#00aeef';
      case 'black':   return '#333333';
      default:        return '#6c757d';
    }
  }

  getOverallTonerPercent(printer: PrinterData): number | null {
    const tonerItems = (printer.consumables || []).filter(
      (item) => item.type === 'Toner' && item.levelPer !== undefined && item.levelPer !== null,
    );

    if (tonerItems.length === 0) {
      return null;
    }

    const total = tonerItems.reduce((sum, item) => sum + (item.levelPer || 0), 0);
    return Math.round(total / tonerItems.length);
  }

  getTonerGaugeDasharray(percent: number | null): string {
    const clamped = Math.max(0, Math.min(percent ?? 0, 100));
    const halfCircumference = 157;
    const filled = (clamped / 100) * halfCircumference;
    return `${filled} ${halfCircumference}`;
  }

  getTonerGaugeColor(percent: number | null): string {
    if (percent === null) {
      return '#adb5bd';
    }

    if (percent <= 20) {
      return '#dc3545';
    }

    if (percent <= 50) {
      return '#f5b800';
    }

    return '#198754';
  }

  getTonerTextColor(color?: string): string {
    switch ((color || '').toLowerCase()) {
      case 'yellow':  return 'text-warning';
      case 'magenta': return 'text-danger';
      case 'cyan':    return 'text-info';
      case 'black':   return 'text-dark';
      default:        return 'text-muted';
    }
  }

  getPrinterApiUrl(ipAddress: string): string {
    return `http://${ipAddress}/wcd/api/AppReqGetCustomData/_111_000_INF000`;
  }

  async testDirectPull(printer: PrinterData): Promise<void> {
    const ip = printer.ipAddress;
    this.directPullLoading[ip] = true;
    this.directPullResults[ip] = 'Running direct browser pull test...';

    try {
      const url = this.getPrinterApiUrl(ip);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      const text = await response.text();
      let parsed: any = null;

      try {
        parsed = JSON.parse(text);
      } catch {
        this.directPullResults[ip] = `HTTP ${response.status}. Non-JSON response (first 300 chars): ${text.slice(0, 300)}`;
        return;
      }

      const hasMfp = Boolean(parsed?.MFP);
      const apiError = parsed?.ErrorDetails || parsed?.ErrorDescription || parsed?.Result?.ResultInfo || parsed?.MFP?.Result?.ErrorDetails || parsed?.MFP?.Result?.ResultInfo;

      if (hasMfp) {
        const consumableCount = Array.isArray(parsed?.MFP?.ConsumableList?.Consumable)
          ? parsed.MFP.ConsumableList.Consumable.length
          : parsed?.MFP?.ConsumableList?.Consumable
            ? 1
            : 0;
        this.directPullResults[ip] = `SUCCESS: HTTP ${response.status}, has MFP payload, consumables=${consumableCount}`;
      } else {
        this.directPullResults[ip] = `HTTP ${response.status}, API error: ${apiError || 'Unknown'}`;
      }
    } catch (err) {
      this.directPullResults[ip] = `Browser fetch failed: ${err instanceof Error ? err.message : 'Unknown error'} (possible CORS or network policy)`;
    } finally {
      this.directPullLoading[ip] = false;
    }
  }

  refresh(): void {
    this.loadPrinters();
    this.loadPrinterConfigs();
    this.loadAlertSettings();
  }
}
