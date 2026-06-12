import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface EquipmentPrinter extends RowDataPacket {
  id: number;
  ip_address: string;
  model: string;
  location?: string;
  device_id?: string;
  api_type?: string;
  session_cookie?: string;
  active: boolean;
  visible_in_ui?: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentPrinterPayload {
  ip_address: string;
  model: string;
  location?: string | null;
  device_id?: string | null;
  api_type?: 'json' | 'xml';
  active?: boolean;
  visible_in_ui?: boolean;
}

export interface EquipmentPrinterAlertState extends RowDataPacket {
  id: number;
  printer_id: number;
  alert_key: string;
  alert_type: string;
  severity: 'warning' | 'critical';
  message: string;
  last_value?: string | null;
  last_seen_at: string;
  last_notified_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentPrinterAlertSettings extends RowDataPacket {
  id: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  cooldown_minutes: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class EquipmentPrintersRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {
  }

  async getActivePrinters(): Promise<EquipmentPrinter[]> {
    const query = `
      SELECT 
        id,
        ip_address,
        model,
        location,
        device_id,
        api_type,
        session_cookie,
        active,
        visible_in_ui,
        last_sync_at,
        created_at,
        updated_at
      FROM equipment_printers
      WHERE active = true
        AND visible_in_ui = true
      ORDER BY location ASC
    `;

    const rows = await this.mysqlService.query<EquipmentPrinter[]>(query);
    return Array.isArray(rows) ? rows : [];
  }

  async getAllPrinters(): Promise<EquipmentPrinter[]> {
    const query = `
      SELECT 
        id,
        ip_address,
        model,
        location,
        device_id,
        api_type,
        session_cookie,
        active,
        visible_in_ui,
        last_sync_at,
        created_at,
        updated_at
      FROM equipment_printers
      ORDER BY location ASC, ip_address ASC
    `;

    const rows = await this.mysqlService.query<EquipmentPrinter[]>(query);
    return Array.isArray(rows) ? rows : [];
  }

  async getPrinterById(id: number): Promise<EquipmentPrinter | null> {
    const query = `
      SELECT 
        id,
        ip_address,
        model,
        location,
        device_id,
        api_type,
        session_cookie,
        active,
        visible_in_ui,
        last_sync_at,
        created_at,
        updated_at
      FROM equipment_printers
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<EquipmentPrinter[]>(query, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  async createPrinter(payload: EquipmentPrinterPayload): Promise<number> {
    const query = `
      INSERT INTO equipment_printers (
        ip_address,
        model,
        location,
        device_id,
        api_type,
        active,
        visible_in_ui
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(query, [
      payload.ip_address,
      payload.model,
      payload.location ?? null,
      payload.device_id ?? null,
      payload.api_type ?? 'json',
      payload.active ?? true,
      payload.visible_in_ui ?? true,
    ]);

    return result.insertId;
  }

  async updatePrinterById(
    id: number,
    payload: Partial<EquipmentPrinterPayload>,
  ): Promise<number> {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return 0;
    }

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value);

    const query = `
      UPDATE equipment_printers
      SET ${setClause}
      WHERE id = ?
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(query, [
      ...values,
      id,
    ]);

    return result.affectedRows;
  }

  async updateLastSync(printerId: number): Promise<void> {
    const query = `
      UPDATE equipment_printers
      SET last_sync_at = NOW()
      WHERE id = ?
    `;
    await this.mysqlService.execute(query, [printerId]);
  }

  async getActiveAlertStates(): Promise<EquipmentPrinterAlertState[]> {
    const query = `
      SELECT
        id,
        printer_id,
        alert_key,
        alert_type,
        severity,
        message,
        last_value,
        last_seen_at,
        last_notified_at,
        is_active,
        created_at,
        updated_at
      FROM equipment_printer_alert_state
      WHERE is_active = true
    `;

    const rows = await this.mysqlService.query<EquipmentPrinterAlertState[]>(query);
    return Array.isArray(rows) ? rows : [];
  }

  async upsertAlertState(params: {
    printerId: number;
    alertKey: string;
    alertType: string;
    severity: 'warning' | 'critical';
    message: string;
    lastValue?: string;
    notifiedNow?: boolean;
  }): Promise<void> {
    const query = `
      INSERT INTO equipment_printer_alert_state (
        printer_id,
        alert_key,
        alert_type,
        severity,
        message,
        last_value,
        last_seen_at,
        last_notified_at,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, true)
      ON DUPLICATE KEY UPDATE
        alert_type = VALUES(alert_type),
        severity = VALUES(severity),
        message = VALUES(message),
        last_value = VALUES(last_value),
        last_seen_at = NOW(),
        last_notified_at = CASE
          WHEN VALUES(last_notified_at) IS NOT NULL THEN VALUES(last_notified_at)
          ELSE last_notified_at
        END,
        is_active = true
    `;

    await this.mysqlService.execute(query, [
      params.printerId,
      params.alertKey,
      params.alertType,
      params.severity,
      params.message,
      params.lastValue ?? null,
      params.notifiedNow ? new Date() : null,
    ]);
  }

  async deactivateAlertStateById(id: number): Promise<void> {
    const query = `
      UPDATE equipment_printer_alert_state
      SET is_active = false
      WHERE id = ?
    `;

    await this.mysqlService.execute(query, [id]);
  }

  async getAlertSettings(): Promise<EquipmentPrinterAlertSettings | null> {
    const query = `
      SELECT
        id,
        warning_threshold_percent,
        critical_threshold_percent,
        cooldown_minutes,
        is_enabled,
        created_at,
        updated_at
      FROM equipment_printer_alert_settings
      WHERE id = 1
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<EquipmentPrinterAlertSettings[]>(query);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  async upsertAlertSettings(params: {
    warningThresholdPercent: number;
    criticalThresholdPercent: number;
    cooldownMinutes: number;
    isEnabled: boolean;
  }): Promise<void> {
    const query = `
      INSERT INTO equipment_printer_alert_settings (
        id,
        warning_threshold_percent,
        critical_threshold_percent,
        cooldown_minutes,
        is_enabled
      ) VALUES (1, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        warning_threshold_percent = VALUES(warning_threshold_percent),
        critical_threshold_percent = VALUES(critical_threshold_percent),
        cooldown_minutes = VALUES(cooldown_minutes),
        is_enabled = VALUES(is_enabled)
    `;

    await this.mysqlService.execute(query, [
      params.warningThresholdPercent,
      params.criticalThresholdPercent,
      params.cooldownMinutes,
      params.isEnabled,
    ]);
  }
}
