import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SerialAssignmentsService {
  private readonly API_URL = 'serial-assignments';

  constructor(private http: HttpClient) {}

  /**
   * Get all serial assignments with optional filters
   */
  async getAssignments(filters?: any): Promise<any> {
    let params = new HttpParams().set('action', 'get_assignments');
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: number): Promise<any> {
    const params = new HttpParams()
      .set('action', 'get_assignment')
      .set('id', id.toString());
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get assignments by work order
   */
  async getAssignmentsByWorkOrder(workOrderNumber: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'get_assignments')
      .set('work_order_number', workOrderNumber);
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get assignments by serial number
   */
  async getAssignmentsBySerial(serialNumber: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'get_assignments')
      .set('serial_number', serialNumber);
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get assignment statistics
   */
  async getStatistics(): Promise<any> {
    const params = new HttpParams().set('action', 'get_statistics');
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get assignments grouped by serial type
   */
  async getAssignmentsByType(): Promise<any> {
    const params = new HttpParams().set('action', 'get_by_type');
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get recent assignments
   */
  async getRecentAssignments(limit: number = 10): Promise<any> {
    const params = new HttpParams()
      .set('action', 'get_recent')
      .set('limit', limit.toString());
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Search assignments
   */
  async searchAssignments(searchTerm: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'search')
      .set('term', searchTerm);
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Export assignments to CSV
   */
  async exportAssignments(filters?: any): Promise<Blob> {
    let params = new HttpParams().set('action', 'export');
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    
    return await firstValueFrom(
      this.http.get(`${this.API_URL}/index.php`, { 
        params,
        responseType: 'blob'
      })
    );
  }

  /**
   * Void an assignment (soft delete)
   */
  async voidAssignment(id: number, reason: string, performedBy: string): Promise<any> {
    const params = new HttpParams().set('action', 'void_assignment');
    const body = { id, reason, performed_by: performedBy };
    
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/index.php`, body, { params })
    );
  }

  /**
   * Delete an assignment (hard delete)
   */
  async deleteAssignment(id: number, reason: string, performedBy: string): Promise<any> {
    const params = new HttpParams().set('action', 'delete_assignment');
    const body = { id, reason, performed_by: performedBy };
    
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/index.php`, body, { params })
    );
  }

  /**
   * Restore a voided assignment
   */
  async restoreAssignment(id: number, performedBy: string): Promise<any> {
    const params = new HttpParams().set('action', 'restore_assignment');
    const body = { id, performed_by: performedBy };
    
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/index.php`, body, { params })
    );
  }

  /**
   * Bulk void assignments
   */
  async bulkVoidAssignments(ids: number[], reason: string, performedBy: string): Promise<any> {
    const params = new HttpParams().set('action', 'bulk_void');
    const body = { ids, reason, performed_by: performedBy };
    
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/index.php`, body, { params })
    );
  }

  /**
   * Bulk create "Other" customer assignments
   * Creates assignment records without customer asset generation
   */
  async bulkCreateOther(assignments: any[], performedBy: string): Promise<any> {
    const params = new HttpParams().set('action', 'bulk_create_other');
    const body = { assignments, performed_by: performedBy };
    
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/index.php`, body, { params })
    );
  }

  /**
   * Get audit trail for assignment(s)
   */
  async getAuditTrail(assignmentId?: number, limit: number = 100): Promise<any> {
    let params = new HttpParams()
      .set('action', 'get_audit_trail')
      .set('limit', limit.toString());
    
    if (assignmentId) {
      params = params.set('assignment_id', assignmentId.toString());
    }
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get all consumed serials from all sources (comprehensive view)
   * Includes: serial_assignments, ul_label_usages, agsSerialGenerator, sgAssetGenerator, used igt_serial_numbers
   */
  async getAllConsumedSerials(filters?: any): Promise<any> {
    let params = new HttpParams().set('action', 'get_all_consumed_serials');
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get consumed serials summary statistics
   */
  async getConsumedSerialsSummary(): Promise<any> {
    const params = new HttpParams().set('action', 'get_consumed_summary');
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get daily consumption trend (last 30 days)
   */
  async getDailyConsumptionTrend(): Promise<any> {
    const params = new HttpParams().set('action', 'get_consumption_trend');
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get user consumption activity
   */
  async getUserConsumptionActivity(): Promise<any> {
    const params = new HttpParams().set('action', 'get_user_activity');
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * Get work order serial tracking
   */
  async getWorkOrderSerials(workOrder?: string): Promise<any> {
    let params = new HttpParams().set('action', 'get_work_order_serials');
    
    if (workOrder) {
      params = params.set('work_order', workOrder);
    }
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * VERIFICATION SYSTEM - Create verification session (supports batch mode)
   */
  async createVerificationSession(
    assignmentId: number, 
    expectedSerial: string | string[], // Can be single serial or array of serials for batch
    createdBy: string,
    expectedUl?: string,
    workflowSessionId?: string // Add workflow session ID parameter
  ): Promise<any> {
    const body: any = {
      assignment_id: assignmentId,
      created_by: createdBy
    };
    
    // Handle batch mode (array) or single mode (string)
    if (Array.isArray(expectedSerial)) {
      body.expected_serials = expectedSerial; // Batch mode
    } else {
      body.expected_serial = expectedSerial; // Single mode (backward compatibility)
    }
    
    // Add UL number if provided
    if (expectedUl) {
      body.expected_ul = expectedUl;
    }
    
    // Add workflow session ID if provided
    if (workflowSessionId) {
      body.workflow_session_id = workflowSessionId;
    }
    
    return await firstValueFrom(
      this.http.post('verification-session/create-session.php', body)
    );
  }

  /**
   * VERIFICATION SYSTEM - Get verification session status
   */
  async getVerificationSession(sessionId: string): Promise<any> {
    const params = new HttpParams().set('session_id', sessionId);
    return await firstValueFrom(
      this.http.get('verification-session/get-session.php', { params })
    );
  }

  /**
   * VERIFICATION SYSTEM - Update verification session
   */
  async updateVerificationSession(
    sessionId: string,
    capturedSerial?: string,
    matchResult?: string,
    photoPath?: string,
    errorMessage?: string,
    performedBy?: string
  ): Promise<any> {
    const body = {
      session_id: sessionId,
      captured_serial: capturedSerial,
      match_result: matchResult,
      photo_path: photoPath,
      error_message: errorMessage,
      performed_by: performedBy
    };
    
    return await firstValueFrom(
      this.http.post('verification-session/update-session.php', body)
    );
  }

  /**
   * UL AUDIT SIGN-OFF - Get audit signoffs
   */
  async getAuditSignoffs(): Promise<any> {
    const params = new HttpParams().set('action', 'get_audit_signoffs');
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  /**
   * UL AUDIT SIGN-OFF - Submit audit signoff
   */
  async submitAuditSignoff(signoff: any): Promise<any> {
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/index.php?action=submit_audit_signoff`, signoff)
    );
  }
}
