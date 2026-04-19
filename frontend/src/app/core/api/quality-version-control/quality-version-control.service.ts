import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface QualityDocument {
  id: string | number; // API returns string, but we'll handle both
  document_number: string; // e.g., "QA-FRM-202"
  prefix: string; // e.g., "QA-FRM"
  sequence_number: string; // e.g., "202"
  title: string;
  description?: string;
  department: string;
  status: 'draft' | 'review' | 'approved' | 'superseded' | 'obsolete';
  current_revision: string | number; // API returns string, but we'll handle both
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  // Current revision details (flattened from the database view)
  current_revision_description?: string;
  current_revision_created_by?: string;
  current_revision_created_at?: string;
  current_revision_file_path?: string | null;
  // Legacy properties for backward compatibility
  document_type?: 'FRM' | 'SOP' | 'CHK' | 'INS' | 'QCP' | 'WI';
  category?: 'quality_control' | 'training' | 'process' | 'safety' | 'compliance';
  is_active?: boolean;
  revisions?: QualityRevision[];
}

export interface QualityRevision {
  id: number;
  document_id: number;
  revision_number: number; // 1, 2, 3, etc.
  version_string: string; // "QA-FRM-202, rev2"
  title: string;
  description?: string;
  change_description: string; // What changed in this revision
  effective_date: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'superseded' | 'obsolete';
  is_current: boolean;
  template_data?: any; // The actual checklist template data
  file_attachments?: string[];
}

export interface VersionControlStats {
  total_documents: number;
  active_documents: number;
  pending_approvals: number;
  documents_by_type: Record<string, number>;
  recent_revisions: QualityRevision[];
}

export interface CreateDocumentRequest {
  document_type: QualityDocument['document_type'];
  title: string;
  description?: string;
  category: QualityDocument['category'];
  department: string;
  initial_revision: {
    title: string;
    description?: string;
    change_description: string;
    effective_date: string;
    template_data?: any;
  };
}

export interface CreateRevisionRequest {
  document_id: number;
  title: string;
  description?: string;
  change_description: string;
  effective_date: string;
  template_data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class QualityVersionControlService {
  private readonly baseUrl = 'apiv2/quality-version-control';
  private documentsSubject = new BehaviorSubject<QualityDocument[]>([]);
  
  public documents$ = this.documentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Document Management
  getDocuments(params?: {
    type?: string;
    category?: string;
    department?: string;
    status?: string;
    search?: string;
  }): Observable<QualityDocument[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) httpParams = httpParams.set(key, value);
      });
    }
    return this.http.get<QualityDocument[]>(`${this.baseUrl}/documents`, { params: httpParams })
      .pipe(tap(documents => this.documentsSubject.next(documents)));
  }

  getDocument(id: number): Observable<QualityDocument> {
    return this.http.get<QualityDocument>(`${this.baseUrl}/documents/${id}`);
  }

  createDocument(request: CreateDocumentRequest): Observable<QualityDocument> {
    return this.http.post<{success: boolean, message: string, document_id: number, document_number: string, document: QualityDocument}>(`${this.baseUrl}/documents`, request)
      .pipe(
        map(response => {
          if (response.success) {
            return response.document || {
              id: response.document_id,
              document_number: response.document_number,
              title: request.title,
              description: request.description || '',
              department: request.department,
              status: 'draft' as const,
              current_revision: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: '1'
            } as QualityDocument;
          }
          throw new Error(response.message || 'Failed to create document');
        }),
        tap(() => this.refreshDocuments())
      );
  }

  updateDocument(id: number, updates: Partial<QualityDocument>): Observable<QualityDocument> {
    return this.http.put<{success: boolean, message: string}>(`${this.baseUrl}/documents/${id}`, updates)
      .pipe(
        map(response => {
          if (response.success) return { id, ...updates } as QualityDocument;
          throw new Error(response.message || 'Failed to update document');
        }),
        tap(() => this.refreshDocuments())
      );
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<{success: boolean, message: string}>(`${this.baseUrl}/documents/${id}`)
      .pipe(
        map(response => {
          if (!response.success) throw new Error(response.message || 'Failed to delete document');
        }),
        tap(() => this.refreshDocuments())
      );
  }

  // Revision Management
  getRevisions(documentId: number): Observable<QualityRevision[]> {
    return this.http.get<QualityRevision[]>(`${this.baseUrl}/documents/${documentId}/revisions`);
  }

  createRevision(request: CreateRevisionRequest): Observable<QualityRevision> {
    return this.http.post<{success: boolean, message: string, revision_number: number, revision_id: number}>(`${this.baseUrl}/revisions`, request)
      .pipe(
        map(response => {
          if (response.success) {
            return {
              id: response.revision_id || 0,
              document_id: request.document_id,
              revision_number: response.revision_number,
              version_string: '',
              title: request.title,
              description: request.description || '',
              change_description: request.change_description,
              effective_date: request.effective_date,
              created_by: 1,
              created_at: new Date().toISOString(),
              status: 'draft' as const,
              is_current: true,
              template_data: request.template_data
            } as QualityRevision;
          }
          throw new Error(response.message || 'Failed to create revision');
        })
      );
  }

  approveRevision(revisionId: number): Observable<boolean> {
    return this.http.post<{success: boolean, message: string}>(`${this.baseUrl}/revisions/${revisionId}/approve`, { approved_by: 'user' })
      .pipe(map(response => response.success));
  }

  rejectRevision(revisionId: number, reason: string = ''): Observable<boolean> {
    return this.http.post<{success: boolean, message: string}>(`${this.baseUrl}/revisions/${revisionId}/reject`, { rejected_by: 'user', reason })
      .pipe(map(response => response.success));
  }

  getCurrentRevision(documentId: number): Observable<QualityRevision> {
    return this.getRevisions(documentId)
      .pipe(map(revisions => revisions.find(r => r.is_current) || revisions[0]));
  }

  updateRevision(id: number, updates: Partial<QualityRevision>): Observable<QualityRevision> {
    return this.http.put<{success: boolean, message: string}>(`${this.baseUrl}/revisions/${id}`, updates)
      .pipe(
        map(response => {
          if (response.success) return { id, ...updates } as QualityRevision;
          throw new Error(response.message || 'Failed to update revision');
        }),
        tap(() => this.refreshDocuments())
      );
  }

  // Document Number Generation and Statistics
  generateDocumentNumber(type: string, department?: string): Observable<string> {
    let params = new HttpParams().set('document_type', type);
    if (department) params = params.set('department', department);
    return this.http.get<{document_number: string, formatted: string}>(`${this.baseUrl}/generate-document-number`, { params })
      .pipe(map(response => response.document_number));
  }

  getStats(): Observable<VersionControlStats> {
    return this.http.get<any>(`${this.baseUrl}/stats`)
      .pipe(
        map(data => ({
          total_documents: data.by_status?.reduce((sum: number, item: any) => sum + Number(item.count), 0) || 0,
          active_documents: data.by_status?.find((item: any) => item.status === 'approved')?.count || 0,
          pending_approvals: data.pending_approvals || 0,
          documents_by_type: data.by_type?.reduce((acc: any, item: any) => {
            acc[item.document_type] = item.count;
            return acc;
          }, {}) || {},
          recent_revisions: data.recent_activity || []
        } as VersionControlStats))
      );
  }

  getDepartments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/departments`);
  }

  // Search functionality
  searchDocuments(query: string, filters?: {status?: string, department?: string}): Observable<QualityDocument[]> {
    let params = new HttpParams().set('q', query);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.department) params = params.set('department', filters.department);
    return this.http.get<QualityDocument[]>(`${this.baseUrl}/documents/search`, { params });
  }

  // Export functionality
  exportDocument(documentId: number, format: 'pdf' | 'json' | 'excel' = 'pdf'): Observable<Blob> {
    const params = new HttpParams()
      .set('document_id', documentId.toString())
      .set('format', format);
    return this.http.get(`${this.baseUrl}/documents/${documentId}/export`, { params, responseType: 'blob' });
  }

  // Utility Methods
  formatVersionString(documentNumber: string, revisionNumber: number): string {
    return `${documentNumber}, rev${revisionNumber}`;
  }

  parseVersionString(versionString: string): { documentNumber: string; revisionNumber: number } | null {
    const match = versionString.match(/^(.+),\s*rev(\d+)$/i);
    if (match) {
      return {
        documentNumber: match[1].trim(),
        revisionNumber: parseInt(match[2], 10)
      };
    }
    return null;
  }

  private refreshDocuments(): void {
    this.getDocuments().subscribe();
  }
}
