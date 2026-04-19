import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChecklistInstance, ChecklistTemplate, ChecklistConfig } from './photo-checklist-config.service';

@Injectable({
  providedIn: 'root',
})
export class PhotoChecklistV2Service {
  private readonly baseUrl = 'apiV2/inspection-checklist';

  constructor(private readonly http: HttpClient) {}

  getTemplates(): Observable<ChecklistTemplate[]> {
    return this.http.get<ChecklistTemplate[]>(`${this.baseUrl}/templates`);
  }

  getTemplate(id: number): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(`${this.baseUrl}/templates/${id}`);
  }

  getInstances(filters?: { status?: string; work_order?: string }): Observable<ChecklistInstance[]> {
    const query: string[] = [];
    if (filters?.status) {
      query.push(`status=${encodeURIComponent(filters.status)}`);
    }
    if (filters?.work_order) {
      query.push(`work_order=${encodeURIComponent(filters.work_order)}`);
    }

    const suffix = query.length > 0 ? `?${query.join('&')}` : '';
    return this.http.get<ChecklistInstance[]>(`${this.baseUrl}/instances${suffix}`);
  }

  createInstance(instance: Partial<ChecklistInstance>): Observable<{ success: boolean; instance_id: number }> {
    return this.http.post<{ success: boolean; instance_id: number }>(`${this.baseUrl}/instances`, instance);
  }

  getConfig(): Observable<ChecklistConfig[]> {
    return this.http.get<ChecklistConfig[]>(`${this.baseUrl}/config`);
  }

  updateConfig(updates: Record<string, string>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/config`, updates);
  }
}
