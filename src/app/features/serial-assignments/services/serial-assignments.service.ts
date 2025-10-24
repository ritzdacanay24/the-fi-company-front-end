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
}
