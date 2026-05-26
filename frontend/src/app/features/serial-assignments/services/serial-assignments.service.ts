import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SerialAssignmentsService {
  private readonly API_URL = 'apiV2/serial-assignments';
  private consumedSerialsCache?: {
    cacheKey: string;
    expiresAt: number;
    response: any;
  };

  constructor(private http: HttpClient) {}

  private buildCacheKey(filters?: any): string {
    if (!filters) {
      return '{}';
    }

    const normalized = Object.keys(filters)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

    return JSON.stringify(normalized);
  }

  clearConsumedSerialsCache(): void {
    this.consumedSerialsCache = undefined;
  }

  async getAssignments(filters?: any): Promise<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return firstValueFrom(this.http.get(this.API_URL, { params }));
  }

  async getAssignmentById(id: number): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/${id}`));
  }

  async getAssignmentsByUlNumber(ulNumber: string): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/by-ul/${encodeURIComponent(ulNumber)}`));
  }

  async getAssignmentsByIgtSerialNumber(serialNumber: string): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/by-igt/${encodeURIComponent(serialNumber)}`));
  }

  async getAssignmentsByWorkOrder(workOrderNumber: string): Promise<any> {
    const params = new HttpParams().set('wo_number', workOrderNumber);
    return firstValueFrom(this.http.get(this.API_URL, { params }));
  }

  async getAssignmentsBySerial(serialNumber: string): Promise<any> {
    const params = new HttpParams().set('eyefi_serial_number', serialNumber);
    return firstValueFrom(this.http.get(this.API_URL, { params }));
  }

  async getStatistics(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/stats`));
  }

  async getAssignmentsByType(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/stats`));
  }

  async getRecentAssignments(limit: number = 10): Promise<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return firstValueFrom(this.http.get(this.API_URL, { params }));
  }

  async searchAssignments(searchTerm: string): Promise<any> {
    const params = new HttpParams().set('eyefi_serial_number', searchTerm);
    return firstValueFrom(this.http.get(this.API_URL, { params }));
  }

  async exportAssignments(filters?: any): Promise<Blob> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return firstValueFrom(this.http.get(this.API_URL, { params, responseType: 'blob' }));
  }

  async voidAssignment(id: number, reason: string, performedBy: string): Promise<any> {
    const result = await firstValueFrom(
      this.http.post(`${this.API_URL}/${id}/void`, { reason, performed_by: performedBy })
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async deleteAssignment(id: number, reason: string, performedBy: string): Promise<any> {
    const result = await firstValueFrom(
      this.http.delete(`${this.API_URL}/${id}`, { body: { reason, performed_by: performedBy } } as any)
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async restoreAssignment(id: number, performedBy: string): Promise<any> {
    const result = await firstValueFrom(
      this.http.post(`${this.API_URL}/${id}/restore`, { performed_by: performedBy })
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async reassignAssignment(
    id: number,
    newWoNumber: string,
    reason: string,
    performedBy: string,
    woDetails?: {
      wo_description?: string;
      wo_part?: string;
      wo_qty_ord?: number;
      wo_due_date?: string;
      wo_routing?: string;
      wo_line?: string;
      cp_cust_part?: string;
      cp_cust?: string;
    }
  ): Promise<any> {
    const result = await firstValueFrom(
      this.http.post(`${this.API_URL}/${id}/reassign`, {
        new_wo_number: newWoNumber,
        reason,
        performed_by: performedBy,
        ...woDetails,
      })
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async bulkVoidAssignments(ids: number[], reason: string, performedBy: string): Promise<any> {
    const result = await firstValueFrom(
      this.http.post(`${this.API_URL}/bulk-void`, { ids, reason, performed_by: performedBy })
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async bulkCreateOther(assignments: any[], performedBy: string): Promise<any> {
    // Not yet migrated â€” kept for backward compatibility
    const result = await firstValueFrom(
      this.http.post(`${this.API_URL}/bulk-create-other`, { assignments, performed_by: performedBy })
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async bulkCreateWorkflow(customerType: 'sg' | 'ags' | 'igt' | 'other', assignments: any[], performedBy: string): Promise<any> {
    const result = await firstValueFrom(
      this.http.post(`${this.API_URL}/bulk-create-workflow`, {
        customer_type: customerType,
        assignments,
        performed_by: performedBy,
      })
    );
    this.clearConsumedSerialsCache();
    return result;
  }

  async getAuditTrail(assignmentId?: number, limit: number = 100): Promise<any> {
    if (assignmentId) {
      const params = new HttpParams().set('limit', limit.toString());
      return firstValueFrom(this.http.get(`${this.API_URL}/${assignmentId}/audit`, { params }));
    }
    const params = new HttpParams().set('limit', limit.toString());
    return firstValueFrom(this.http.get(`${this.API_URL}/audit-trail`, { params }));
  }

  async getAllConsumedSerials(
    filters?: any,
    options?: { forceRefresh?: boolean; cacheTtlMs?: number },
  ): Promise<any> {
    const forceRefresh = options?.forceRefresh === true;
    const cacheTtlMs = options?.cacheTtlMs ?? 30000;
    const cacheKey = this.buildCacheKey(filters);

    if (!forceRefresh && this.consumedSerialsCache) {
      const isValid =
        this.consumedSerialsCache.cacheKey === cacheKey &&
        this.consumedSerialsCache.expiresAt > Date.now();

      if (isValid) {
        return this.consumedSerialsCache.response;
      }
    }

    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    const response = await firstValueFrom(this.http.get(this.API_URL, { params }));
    this.consumedSerialsCache = {
      cacheKey,
      expiresAt: Date.now() + cacheTtlMs,
      response,
    };

    return response;
  }

  async getDailyConsumptionTrend(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/consumption-trend`));
  }

  async getUserConsumptionActivity(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API_URL}/user-activity`));
  }

  async getWorkOrderSerials(workOrder?: string): Promise<any> {
    const params = workOrder ? new HttpParams().set('work_order', workOrder) : new HttpParams();
    return firstValueFrom(this.http.get(`${this.API_URL}/work-orders`, { params }));
  }

  // â”€â”€ Verification system (still on PHP, not yet migrated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createVerificationSession(
    assignmentId: number,
    expectedSerial: string | string[],
    createdBy: string,
    expectedUl?: string,
    workflowSessionId?: string,
  ): Promise<any> {
    const body: any = { assignment_id: assignmentId, created_by: createdBy };
    if (Array.isArray(expectedSerial)) {
      body.expected_serials = expectedSerial;
    } else {
      body.expected_serial = expectedSerial;
    }
    if (expectedUl) body.expected_ul = expectedUl;
    if (workflowSessionId) body.workflow_session_id = workflowSessionId;
    return firstValueFrom(this.http.post('verification-session/create-session.php', body));
  }

  async getVerificationSession(sessionId: string): Promise<any> {
    const params = new HttpParams().set('session_id', sessionId);
    return firstValueFrom(this.http.get('verification-session/get-session.php', { params }));
  }

  async updateVerificationSession(
    sessionId: string,
    capturedSerial?: string,
    matchResult?: string,
    photoPath?: string,
    errorMessage?: string,
    performedBy?: string,
  ): Promise<any> {
    return firstValueFrom(
      this.http.post('verification-session/update-session.php', {
        session_id: sessionId,
        captured_serial: capturedSerial,
        match_result: matchResult,
        photo_path: photoPath,
        error_message: errorMessage,
        performed_by: performedBy,
      }),
    );
  }
}

