import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DocumentControl {
  id?: number;
  document_number: string;
  document_prefix: string;
  document_sequence: number;
  document_title: string;
  document_type: string;
  category: string;
  department: string;
  current_revision: string;
  current_template_id?: number;
  status: string;
  document_owner_id?: number;
  document_owner_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentRevision {
  id?: number;
  document_control_id: number;
  document_number: string;
  revision_number: string;
  revision_major: number;
  revision_minor: number;
  template_id: number;
  revision_type: 'major' | 'minor' | 'correction' | 'editorial';
  revision_description: string;
  reason_for_change?: string;
  changes_summary?: any;
  items_added?: number;
  items_removed?: number;
  items_modified?: number;
  status: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  effective_date?: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
}

export interface CreateRevisionRequest {
  document_number: string;
  template_id: number;
  revision_type: 'major' | 'minor';
  revision_description: string;
  reason_for_change?: string;
  changes_summary?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentControlService {
  private apiUrl = `${environment.apiUrl}/document-control`;

  constructor(private http: HttpClient) { }

  /**
   * Get next available document number
   */
  getNextDocumentNumber(prefix: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/next-number`, { prefix });
  }

  /**
   * Create a new document control entry
   */
  createDocument(data: Partial<DocumentControl>): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-document`, data);
  }

  /**
   * Create a new revision for an existing document
   */
  createRevision(data: CreateRevisionRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-revision`, data);
  }

  /**
   * Approve a revision
   */
  approveRevision(revisionId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/approve/${revisionId}`, {});
  }

  /**
   * Get document details
   */
  getDocument(documentNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/document/${documentNumber}`);
  }

  /**
   * Get revision history for a document
   */
  getRevisionHistory(documentNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/document/${documentNumber}/revisions`);
  }

  /**
   * Get audit log for a document
   */
  getAuditLog(documentNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/document/${documentNumber}/audit`);
  }

  /**
   * Get list of active documents
   */
  getActiveDocuments(filters?: { department?: string; category?: string }): Observable<any> {
    const params = new URLSearchParams(filters as any).toString();
    return this.http.get(`${this.apiUrl}/active-documents?${params}`);
  }

  /**
   * Format revision number for display
   */
  formatRevisionNumber(major: number, minor: number): string {
    return `${major}.${minor.toString().padStart(2, '0')}`;
  }

  /**
   * Parse revision number into major and minor
   */
  parseRevisionNumber(revisionNumber: string): { major: number; minor: number } {
    const parts = revisionNumber.split('.');
    return {
      major: parseInt(parts[0]) || 1,
      minor: parseInt(parts[1]) || 0
    };
  }

  /**
   * Determine next revision number based on type
   */
  getNextRevisionNumber(currentRevision: string, revisionType: 'major' | 'minor'): string {
    const { major, minor } = this.parseRevisionNumber(currentRevision);
    
    if (revisionType === 'major') {
      return this.formatRevisionNumber(major + 1, 0);
    } else {
      return this.formatRevisionNumber(major, minor + 1);
    }
  }
}
