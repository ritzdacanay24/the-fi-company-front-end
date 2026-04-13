import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Updated to use the correct IGT serial numbers API
const API_URL = 'Quality/igt-serial/index.php';

@Injectable({
  providedIn: 'root'
})
export class IgtAssetService {

  constructor(private http: HttpClient) {}

  // Get all IGT serial numbers (available for assignment)
  getAll(filters?: any): Promise<any> {
    const params = filters || { status: 'available' };
    return firstValueFrom(this.http.get<any>(API_URL, { params }));
  }

  // Get an IGT serial by ID
  getById(id: number): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_URL}?id=${id}`));
  }

  // Create a new IGT asset (legacy method - keeping for compatibility)
  create(asset: any): Promise<any> {
    return firstValueFrom(this.http.post(API_URL, asset));
  }

  // Update an existing IGT asset (legacy method - keeping for compatibility)
  update(id: number, data: any): Promise<any> {
    console.log('Updating IGT asset with ID:', id, 'and data:', data);
    return firstValueFrom(this.http.put(`${API_URL}?id=${id}`, data));
  }

  // Delete an IGT asset (legacy method - keeping for compatibility)
  delete(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_URL}?id=${id}`));
  }

  // Bulk create IGT assets with serial assignments
  bulkCreate(assignments: any[], userFullName: string = 'System'): Promise<any> {
    return firstValueFrom(
      this.http.post(`${API_URL}?action=bulkCreate`, { 
        assignments,
        user_full_name: userFullName 
      })
    );
  }
}
