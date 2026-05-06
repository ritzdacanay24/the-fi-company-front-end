import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  constructor(private readonly http: HttpClient) {}

  getQadConnectionStatus = async (): Promise<{ isConnected: boolean; message: string }> =>
    firstValueFrom(
      this.http.get<{ isConnected: boolean; message: string }>('apiV2/health/qadConnectionStatus'),
    );
}
