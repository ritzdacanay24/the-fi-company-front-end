import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UniqueLabelIdentifier {
  unique_identifier: string;
  part_number: string;
  work_order_number: string | null;
  quantity_printed: number;
  created_at?: string;
}

export interface UniqueLabelBatch {
  id: number;
  source_type: string;
  work_order_number: string | null;
  part_number: string;
  requested_quantity: number;
  created_by_name: string;
  status: 'active' | 'archived' | 'deleted' | string;
  created_at: string;
  generated_count: number;
}

@Injectable({ providedIn: 'root' })
export class UniqueLabelGeneratorApiService {
  private readonly http = inject(HttpClient);

  async lookupWorkOrder(woNumber: string) {
    return firstValueFrom(
      this.http.get<ApiResponse<{ work_order_number: string; part_number: string; quantity: number }>>(
        `/apiV2/unique-labels/work-orders/${encodeURIComponent(woNumber)}`,
      ),
    );
  }

  async createBatch(payload: {
    source_type: 'WO' | 'MANUAL';
    work_order_number: string | null;
    part_number: string;
    quantity: number;
    created_by_name: string;
  }) {
    return firstValueFrom(
      this.http.post<ApiResponse<{ batch_id: number; identifiers: UniqueLabelIdentifier[] }>>(
        '/apiV2/unique-labels/batches',
        payload,
      ),
    );
  }

  async getRecentBatches(limit = 20, status: 'active' | 'archived' | 'deleted' | 'all' = 'active') {
    const params = new HttpParams().set('limit', String(limit)).set('status', status);
    return firstValueFrom(
      this.http.get<ApiResponse<UniqueLabelBatch[]>>('/apiV2/unique-labels/batches', { params }),
    );
  }

  async updateBatch(
    id: number,
    payload: {
      source_type?: 'WO' | 'MANUAL';
      work_order_number?: string | null;
      part_number?: string;
      updated_by_name?: string;
    },
  ) {
    return firstValueFrom(
      this.http.put<ApiResponse<Record<string, unknown>>>(`/apiV2/unique-labels/batches/${id}`, payload),
    );
  }

  async archiveBatch(id: number, actorName: string, reason: string) {
    return firstValueFrom(
      this.http.post<ApiResponse<Record<string, unknown>>>(`/apiV2/unique-labels/batches/${id}/archive`, {
        actor_name: actorName,
        reason,
      }),
    );
  }

  async softDeleteBatch(id: number, actorName: string, reason: string) {
    return firstValueFrom(
      this.http.post<ApiResponse<Record<string, unknown>>>(`/apiV2/unique-labels/batches/${id}/soft-delete`, {
        actor_name: actorName,
        reason,
      }),
    );
  }

  async restoreBatch(id: number, actorName: string) {
    return firstValueFrom(
      this.http.post<ApiResponse<Record<string, unknown>>>(`/apiV2/unique-labels/batches/${id}/restore`, {
        actor_name: actorName,
      }),
    );
  }

  async hardDeleteBatch(id: number) {
    return firstValueFrom(
      this.http.post<ApiResponse<Record<string, unknown>>>(`/apiV2/unique-labels/batches/${id}/hard-delete`, {
        confirm: 'DELETE',
      }),
    );
  }

  async getBatchDetails(id: number) {
    return firstValueFrom(
      this.http.get<ApiResponse<{ batch: Record<string, unknown>; identifiers: UniqueLabelIdentifier[] }>>(
        `/apiV2/unique-labels/batches/${id}`,
      ),
    );
  }

  async getReportSummary(days = 30) {
    const params = new HttpParams().set('days', String(days));
    return firstValueFrom(
      this.http.get<ApiResponse<Record<string, unknown>>>('/apiV2/unique-labels/reports/summary', { params }),
    );
  }

  async getSettings() {
    return firstValueFrom(
      this.http.get<
        ApiResponse<{ quantity_printed_default: number; label_template_name: string; allow_reprint: boolean }>
      >('/apiV2/unique-labels/settings'),
    );
  }

  async updateSettings(payload: {
    quantity_printed_default: number;
    label_template_name: string;
    allow_reprint: boolean;
  }) {
    return firstValueFrom(
      this.http.put<
        ApiResponse<{ quantity_printed_default: number; label_template_name: string; allow_reprint: boolean }>
      >('/apiV2/unique-labels/settings', payload),
    );
  }
}
