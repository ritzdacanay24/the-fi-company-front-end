import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/mr-alert-preferences';

export interface MrAlertPreferences {
  monitorEnabled: boolean;
  enabled: boolean;
  soundEnabled: boolean;
  repeatSeconds: number;
  queues: 'both' | 'picking' | 'validation';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MrAlertPreferencesService {
  constructor(private readonly http: HttpClient) {}

  getMine = async (): Promise<MrAlertPreferences> => {
    return firstValueFrom(this.http.get<MrAlertPreferences>(`${url}/me`));
  }

  updateMine = async (payload: Partial<MrAlertPreferences>): Promise<MrAlertPreferences> => {
    return firstValueFrom(this.http.put<MrAlertPreferences>(`${url}/me`, payload));
  }
}
