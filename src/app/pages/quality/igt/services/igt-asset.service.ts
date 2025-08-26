import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API_URL = 'IgtAssets/igt_serial_numbers_crud?path=assets';

@Injectable({
  providedIn: 'root'
})
export class IgtAssetService {

  constructor(private http: HttpClient) {}

  // Get all IGT assets
  getAll(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(API_URL));
  }

  // Get an IGT asset by ID
  getById(id: number): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_URL}&id=${id}`));
  }

  // Create a new IGT asset
  create(asset: any): Promise<any> {
    return firstValueFrom(this.http.post(API_URL, asset));
  }

  // Update an existing IGT asset
  update(id: number, data: any): Promise<any> {
    // Pass ID in URL parameter, not in request body
    console.log('Updating IGT asset with ID:', id, 'and data:', data); // Debug log
    return firstValueFrom(this.http.put(`${API_URL}&id=${id}`, data));
  }

  // Delete an IGT asset
  delete(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_URL}&id=${id}`));
  }
}
