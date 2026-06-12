import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

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
}

export interface PrinterConfig {
  id: number;
  ip_address: string;
  model: string;
  location?: string | null;
  device_id?: string | null;
  api_type?: 'json' | 'xml';
  active: boolean | number;
  visible_in_ui?: boolean | number;
  last_sync_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrinterConfigPayload {
  ip_address?: string;
  model?: string;
  location?: string | null;
  device_id?: string | null;
  api_type?: 'json' | 'xml';
  active?: boolean;
  visible_in_ui?: boolean;
}

export interface PrinterMutationResponse {
  message: string;
  printer: PrinterConfig;
}

export interface EquipmentPrinterAlertSettings {
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  cooldown_minutes: number;
  is_enabled: boolean;
}

export interface EquipmentPrinterAlertSettingsResponse {
  message: string;
  settings: EquipmentPrinterAlertSettings;
}

@Injectable({
  providedIn: 'root',
})
export class EquipmentPrintersService {
  private apiUrl = `${environment.nestApiBaseUrl}/apiV2/equipment-printers`;

  constructor(private http: HttpClient) {}

  getPrintersStatus(): Observable<PrinterData[]> {
    return this.http.get<PrinterData[]>(`${this.apiUrl}/status`);
  }

  getPrinters(): Observable<PrinterConfig[]> {
    return this.http.get<PrinterConfig[]>(this.apiUrl);
  }

  createPrinter(payload: PrinterConfigPayload): Observable<PrinterMutationResponse> {
    return this.http.post<PrinterMutationResponse>(this.apiUrl, payload);
  }

  updatePrinter(id: number, payload: PrinterConfigPayload): Observable<PrinterMutationResponse> {
    return this.http.put<PrinterMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  getAlertSettings(): Observable<EquipmentPrinterAlertSettings> {
    return this.http.get<EquipmentPrinterAlertSettings>(`${this.apiUrl}/alert-settings`);
  }

  updateAlertSettings(
    payload: EquipmentPrinterAlertSettings,
  ): Observable<EquipmentPrinterAlertSettingsResponse> {
    return this.http.put<EquipmentPrinterAlertSettingsResponse>(
      `${this.apiUrl}/alert-settings`,
      payload,
    );
  }
}
