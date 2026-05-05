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

  getTemplates(options?: { includeInactive?: boolean; includeDeleted?: boolean }): Observable<ChecklistTemplate[]> {
    const query: string[] = [];
    if (options?.includeInactive) {
      query.push('include_inactive=1');
    }
    if (options?.includeDeleted) {
      query.push('include_deleted=1');
    }

    const suffix = query.length > 0 ? `?${query.join('&')}` : '';
    return this.http.get<ChecklistTemplate[]>(`${this.baseUrl}/templates${suffix}`);
  }

  getTemplate(id: number, options?: { includeInactive?: boolean; includeDeleted?: boolean }): Observable<ChecklistTemplate> {
    const query: string[] = [];
    if (options?.includeInactive) {
      query.push('include_inactive=1');
    }
    if (options?.includeDeleted) {
      query.push('include_deleted=1');
    }

    const suffix = query.length > 0 ? `?${query.join('&')}` : '';
    return this.http.get<ChecklistTemplate>(`${this.baseUrl}/templates/${id}${suffix}`);
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

  deleteInstance(id: number): Observable<{ success: boolean; error?: string }> {
    return this.http.delete<{ success: boolean; error?: string }>(`${this.baseUrl}/instances/${id}`);
  }

  archiveInstance(id: number): Observable<{ success: boolean; error?: string }> {
    return this.http.patch<{ success: boolean; error?: string }>(`${this.baseUrl}/instances/${id}/archive`, {});
  }

  getConfig(): Observable<ChecklistConfig[]> {
    return this.http.get<ChecklistConfig[]>(`${this.baseUrl}/config`);
  }

  updateConfig(updates: Record<string, string>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/config`, updates);
  }
}
