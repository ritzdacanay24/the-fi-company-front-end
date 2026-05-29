import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Department {
  id: number;
  department_name: string;
  user_count?: number;
  display_order?: number;
  is_active?: boolean;
  department_head_user_id?: number | null;
  department_head_name?: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  title?: string | null;
}

export interface UserAssignment {
  user_id: number;
  department_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = 'apiV2/departments';

  constructor(private http: HttpClient) {}

  /**
   * Get all departments
   */
  getDepartments(includeInactive = false): Observable<{ success: boolean; data: Department[] }> {
    const params = new HttpParams().set('include_inactive', includeInactive.toString());
    return this.http.get<{ success: boolean; data: Department[] }>(`${this.apiUrl}/`, { params });
  }

  /**
   * Create a new department
   */
  createDepartment(department: Partial<Department>): Observable<{ success: boolean; message: string; department_id?: number }> {
    return this.http.post<{ success: boolean; message: string; department_id?: number }>(`${this.apiUrl}/`, department);
  }

  /**
   * Update a department
   */
  updateDepartment(department: Department): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiUrl}/`, department);
  }

  /**
   * Delete a department
   */
  deleteDepartment(id: number): Observable<{ success: boolean; message: string }> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/`, { params });
  }

  /**
   * Get available users
   */
  getAvailableUsers(): Observable<{ success: boolean; data: User[] }> {
    const params = new HttpParams().set('action', 'users');
    return this.http.get<{ success: boolean; data: User[] }>(`${this.apiUrl}/`, { params });
  }

  /**
   * Assign user to department
   */
  assignUser(assignment: UserAssignment): Observable<{ success: boolean; message: string }> {
    const data = { ...assignment, action: 'assign' };
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/`, data);
  }

  setDepartmentActive(departmentId: number, isActive: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/`, {
      action: 'set-active',
      department_id: departmentId,
      is_active: isActive ? 1 : 0,
    });
  }

  /**
   * Remove user from department
   */
  removeUser(userId: number, departmentId: number): Observable<{ success: boolean; message: string }> {
    const params = new HttpParams()
      .set('user_id', userId.toString())
      .set('id', departmentId.toString());
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/`, { params });
  }

  /**
   * Get org chart structure with departments and users
   */
  getOrgChartStructure(): Observable<{ success: boolean; data: any }> {
    const params = new HttpParams().set('action', 'org-chart');
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/`, { params });
  }
}