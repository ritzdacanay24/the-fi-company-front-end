import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChecklistTemplate, ChecklistInstance, ChecklistInstanceItem, InspectionPhoto } from '../models/checklist-template.interface';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChecklistTemplateApiService {
  private readonly baseUrl = '/backend/api/checklist-templates';
  private readonly instanceUrl = '/backend/api/checklist-instances';

  constructor(private http: HttpClient) {}

  // Template CRUD operations
  getAllTemplates(page = 1, pageSize = 20, search?: string): Observable<ApiResponse<PaginatedResponse<ChecklistTemplate>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<ChecklistTemplate>>>(this.baseUrl, { params });
  }

  getActiveTemplates(): Observable<ApiResponse<ChecklistTemplate[]>> {
    return this.http.get<ApiResponse<ChecklistTemplate[]>>(`${this.baseUrl}/active`);
  }

  getTemplateById(id: string): Observable<ApiResponse<ChecklistTemplate>> {
    return this.http.get<ApiResponse<ChecklistTemplate>>(`${this.baseUrl}/${id}`);
  }

  getTemplatesByCategory(category: string): Observable<ApiResponse<ChecklistTemplate[]>> {
    const params = new HttpParams().set('category', category);
    return this.http.get<ApiResponse<ChecklistTemplate[]>>(`${this.baseUrl}/by-category`, { params });
  }

  getTemplatesByType(type: string): Observable<ApiResponse<ChecklistTemplate[]>> {
    const params = new HttpParams().set('type', type);
    return this.http.get<ApiResponse<ChecklistTemplate[]>>(`${this.baseUrl}/by-type`, { params });
  }

  createTemplate(template: Omit<ChecklistTemplate, 'id' | 'createdDate'>): Observable<ApiResponse<ChecklistTemplate>> {
    return this.http.post<ApiResponse<ChecklistTemplate>>(this.baseUrl, template);
  }

  updateTemplate(id: string, template: Partial<ChecklistTemplate>): Observable<ApiResponse<ChecklistTemplate>> {
    return this.http.put<ApiResponse<ChecklistTemplate>>(`${this.baseUrl}/${id}`, template);
  }

  deleteTemplate(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  duplicateTemplate(id: string, newName: string): Observable<ApiResponse<ChecklistTemplate>> {
    return this.http.post<ApiResponse<ChecklistTemplate>>(`${this.baseUrl}/${id}/duplicate`, { name: newName });
  }

  // Template versioning
  getTemplateVersions(templateId: string): Observable<ApiResponse<ChecklistTemplate[]>> {
    return this.http.get<ApiResponse<ChecklistTemplate[]>>(`${this.baseUrl}/${templateId}/versions`);
  }

  createTemplateVersion(templateId: string, version: string): Observable<ApiResponse<ChecklistTemplate>> {
    return this.http.post<ApiResponse<ChecklistTemplate>>(`${this.baseUrl}/${templateId}/versions`, { version });
  }

  // Instance operations
  createInstance(data: {
    templateId: string;
    assignedTo: string;
    location?: string;
    workOrderId?: string;
    notes?: string;
  }): Observable<ApiResponse<ChecklistInstance>> {
    return this.http.post<ApiResponse<ChecklistInstance>>(this.instanceUrl, data);
  }

  getInstance(id: string): Observable<ApiResponse<ChecklistInstance>> {
    return this.http.get<ApiResponse<ChecklistInstance>>(`${this.instanceUrl}/${id}`);
  }

  updateInstance(id: string, updates: Partial<ChecklistInstance>): Observable<ApiResponse<ChecklistInstance>> {
    return this.http.put<ApiResponse<ChecklistInstance>>(`${this.instanceUrl}/${id}`, updates);
  }

  deleteInstance(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.instanceUrl}/${id}`);
  }

  updateInstanceItem(instanceId: string, itemId: string, updates: Partial<ChecklistInstanceItem>): Observable<ApiResponse<ChecklistInstanceItem>> {
    return this.http.put<ApiResponse<ChecklistInstanceItem>>(`${this.instanceUrl}/${instanceId}/items/${itemId}`, updates);
  }

  completeInstanceItem(instanceId: string, itemId: string, notes?: string): Observable<ApiResponse<ChecklistInstanceItem>> {
    return this.http.post<ApiResponse<ChecklistInstanceItem>>(`${this.instanceUrl}/${instanceId}/items/${itemId}/complete`, { notes });
  }

  skipInstanceItem(instanceId: string, itemId: string, reason: string): Observable<ApiResponse<ChecklistInstanceItem>> {
    return this.http.post<ApiResponse<ChecklistInstanceItem>>(`${this.instanceUrl}/${instanceId}/items/${itemId}/skip`, { reason });
  }

  // Instance queries
  getInstancesByUser(userId: string, status?: string): Observable<ApiResponse<ChecklistInstance[]>> {
    let params = new HttpParams().set('userId', userId);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApiResponse<ChecklistInstance[]>>(`${this.instanceUrl}/by-user`, { params });
  }

  getInstancesByStatus(status: string): Observable<ApiResponse<ChecklistInstance[]>> {
    const params = new HttpParams().set('status', status);
    return this.http.get<ApiResponse<ChecklistInstance[]>>(`${this.instanceUrl}/by-status`, { params });
  }

  getInstancesByTemplate(templateId: string): Observable<ApiResponse<ChecklistInstance[]>> {
    const params = new HttpParams().set('templateId', templateId);
    return this.http.get<ApiResponse<ChecklistInstance[]>>(`${this.instanceUrl}/by-template`, { params });
  }

  getInstancesByWorkOrder(workOrderId: string): Observable<ApiResponse<ChecklistInstance[]>> {
    const params = new HttpParams().set('workOrderId', workOrderId);
    return this.http.get<ApiResponse<ChecklistInstance[]>>(`${this.instanceUrl}/by-work-order`, { params });
  }

  // Photo operations
  uploadPhoto(instanceId: string, itemId: string, file: File, notes?: string): Observable<ApiResponse<InspectionPhoto>> {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) {
      formData.append('notes', notes);
    }

    return this.http.post<ApiResponse<InspectionPhoto>>(
      `${this.instanceUrl}/${instanceId}/items/${itemId}/photos`,
      formData
    );
  }

  deletePhoto(instanceId: string, itemId: string, photoId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.instanceUrl}/${instanceId}/items/${itemId}/photos/${photoId}`
    );
  }

  updatePhotoNotes(instanceId: string, itemId: string, photoId: string, notes: string): Observable<ApiResponse<InspectionPhoto>> {
    return this.http.put<ApiResponse<InspectionPhoto>>(
      `${this.instanceUrl}/${instanceId}/items/${itemId}/photos/${photoId}`,
      { notes }
    );
  }

  // Photo comparison/AI features
  comparePhotoWithSample(instanceId: string, itemId: string, photoId: string, samplePhotoUrl: string): Observable<ApiResponse<{
    matchScore: number;
    matchesSample: boolean;
    qualityScore: number;
    feedback: string[];
  }>> {
    return this.http.post<ApiResponse<any>>(
      `${this.instanceUrl}/${instanceId}/items/${itemId}/photos/${photoId}/compare`,
      { samplePhotoUrl }
    );
  }

  getPhotoAnalysis(instanceId: string, itemId: string, photoId: string): Observable<ApiResponse<{
    qualityScore: number;
    issues: string[];
    suggestions: string[];
  }>> {
    return this.http.get<ApiResponse<any>>(
      `${this.instanceUrl}/${instanceId}/items/${itemId}/photos/${photoId}/analysis`
    );
  }

  // Submission and approval workflow
  submitInstance(instanceId: string, signature?: string): Observable<ApiResponse<ChecklistInstance>> {
    return this.http.post<ApiResponse<ChecklistInstance>>(
      `${this.instanceUrl}/${instanceId}/submit`,
      { signature }
    );
  }

  approveInstance(instanceId: string, notes?: string): Observable<ApiResponse<ChecklistInstance>> {
    return this.http.post<ApiResponse<ChecklistInstance>>(
      `${this.instanceUrl}/${instanceId}/approve`,
      { notes }
    );
  }

  rejectInstance(instanceId: string, reason: string): Observable<ApiResponse<ChecklistInstance>> {
    return this.http.post<ApiResponse<ChecklistInstance>>(
      `${this.instanceUrl}/${instanceId}/reject`,
      { reason }
    );
  }

  // Reports and analytics
  getTemplateUsageStats(startDate?: string, endDate?: string): Observable<ApiResponse<{
    totalTemplates: number;
    activeTemplates: number;
    totalInstances: number;
    completedInstances: number;
    averageCompletionTime: number;
    templateUsage: Array<{
      templateId: string;
      templateName: string;
      usageCount: number;
      averageTime: number;
    }>;
  }>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/usage`, { params });
  }

  getQualityMetrics(templateId?: string, startDate?: string, endDate?: string): Observable<ApiResponse<{
    totalPhotos: number;
    averageQualityScore: number;
    sampleMatchRate: number;
    commonIssues: Array<{
      issue: string;
      count: number;
    }>;
  }>> {
    let params = new HttpParams();
    if (templateId) params = params.set('templateId', templateId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ApiResponse<any>>(`${this.instanceUrl}/analytics/quality`, { params });
  }

  exportInstanceData(instanceId: string, format: 'pdf' | 'excel' = 'pdf'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.instanceUrl}/${instanceId}/export`, {
      params,
      responseType: 'blob'
    });
  }

  // Bulk operations
  bulkUpdateInstances(instanceIds: string[], updates: Partial<ChecklistInstance>): Observable<ApiResponse<{
    updated: number;
    failed: string[];
  }>> {
    return this.http.put<ApiResponse<any>>(`${this.instanceUrl}/bulk-update`, {
      instanceIds,
      updates
    });
  }

  bulkDeleteInstances(instanceIds: string[]): Observable<ApiResponse<{
    deleted: number;
    failed: string[];
  }>> {
    return this.http.delete<ApiResponse<any>>(`${this.instanceUrl}/bulk-delete`, {
      body: { instanceIds }
    });
  }
}