import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SimpleTemplate {
  id?: number;
  name: string;
  description: string;
  part_number: string;
  product_type: string;
  is_draft: boolean;
  items: SimpleItem[];
}

export interface SimpleItem {
  id?: number;
  title: string;
  description: string;
  level: number;
  parent_id?: number;
  order_index: number;
  is_required: boolean;
  submission_type: 'photo' | 'video' | 'either' | 'none';
  photo_requirements?: PhotoRequirements | null;
  references?: ReferenceImage[];
  has_photo_requirements?: boolean;
}

export interface PhotoRequirements {
  min_count?: number;
  max_count?: number;
  min_resolution?: string;
  angles_required?: string[];
  notes?: string;
}

export interface ReferenceImage {
  id?: number;
  item_id: number;
  type: 'good_sample' | 'bad_sample' | 'reference' | 'diagram';
  image_url: string;
  caption: string;
  display_order: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SimpleChecklistService {
  private baseUrl = '/backend/api/checklist-simple/api.php';

  constructor(private http: HttpClient) {}

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}?action=list`);
  }

  getTemplate(id: number): Observable<SimpleTemplate> {
    return this.http.get<SimpleTemplate>(`${this.baseUrl}?action=get&id=${id}`);
  }

  saveTemplate(template: SimpleTemplate): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}?action=save`, template);
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}?action=delete&id=${id}`);
  }

  uploadReference(itemId: number, type: string, caption: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('item_id', itemId.toString());
    formData.append('type', type);
    formData.append('caption', caption);
    formData.append('image', file);
    return this.http.post<any>(`${this.baseUrl}?action=upload-reference`, formData);
  }

  deleteReference(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}?action=delete-reference&id=${id}`);
  }

  reorderReferences(references: ReferenceImage[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}?action=reorder-references`, { references });
  }
}
