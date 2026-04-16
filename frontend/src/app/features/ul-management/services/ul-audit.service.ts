import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UlAuditService {
  constructor(private readonly http: HttpClient) {}

  async getAuditSignoffs(): Promise<any> {
    return await firstValueFrom(this.http.get('apiv2/ul-labels/audit-signoffs'));
  }

  async submitAuditSignoff(signoff: any, email?: string): Promise<any> {
    const body = {
      ...signoff,
      email,
    };

    return await firstValueFrom(this.http.post('apiv2/ul-labels/audit-signoffs', body));
  }
}
