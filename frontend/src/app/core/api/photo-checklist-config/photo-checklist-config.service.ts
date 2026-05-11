import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ChecklistTemplateTransformer, ChecklistTemplateResponse } from './checklist-template.models';

// ==============================================
// Interfaces
// ==============================================

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string;
  part_number: string;
  customer_part_number?: string; // Customer's part number from Word import
  customer_name?: string; // Optional customer name / account
  revision?: string; // Revision number from Word import
  original_filename?: string; // Original Word document filename
  review_date?: string; // Review/revision date
  revision_number?: string; // Formal revision number
  revision_details?: string; // Details about what changed in this revision
  revised_by?: string; // Person who made the revision
  product_type: string;
  category: 'quality_control' | 'installation' | 'maintenance' | 'inspection';
  version: string;
  template_group_id?: number; // Groups all versions of the same template family
  parent_template_id?: number; // Direct parent template ID for version lineage
  edit_target_template_id?: number | null; // Draft template id to open for editing
  is_draft?: boolean;
  is_active: boolean;
  created_by?: string;
  created_by_name?: string;
  published_at?: string | null;
  // Draft owner-lock fields
  draft_owner_id?: number | null;
  draft_owner_name?: string | null;
  draft_lock_expires_at?: string | null;
  active_instances?: number;
  item_count?: number;
  pending_media_items?: number;
  version_count?: number; // Number of versions in this template family
  items?: ChecklistItem[];
  created_at: string;
  updated_at: string;
  // Quality document reference for version control and traceability
  quality_document_metadata?: {
    document_id: number;
    revision_id: number;
    document_number: string;
    version_string: string;
    title: string;
    revision_number: number;
  } | null;
}

export interface ChecklistItemLink {
  title: string;
  url: string;
  description?: string;
}

export interface ChecklistItem {
  id: number;
  template_id: number;
  order_index: number;
  title: string;
  description: string;
  // ✅ TOP-LEVEL: submission_type is a separate ENUM column (photo, video, audio, either)
  submission_type?: 'photo' | 'video' | 'audio' | 'either' | 'none';
  links?: ChecklistItemLink[];
  photo_requirements: PhotoRequirements;
  sample_images: SampleImageData[];
  sample_image_url?: string; // Single image URL field
  sample_videos?: SampleVideoData[]; // NEW: Array of sample reference videos
  video_requirements?: VideoRequirements; // NEW: Video configuration (stored as JSON in database)
  needs_media_upload?: boolean; // True when required sample media is missing and needs follow-up
  submission_time_seconds?: number; // NEW: Per-item submission time limit in seconds (null/0 = no limit) - for backward compatibility
  is_required: boolean;
  max_photos?: number;
  min_photos?: number;
  // Hierarchical structure support
  level?: number; // 0 = parent/root item, 1 = child/sub-item
  parent_id?: number; // Reference to parent item's ID or order_index
  children?: ChecklistItem[]; // Sub-items (e.g., multiple reference photos for one inspection item)
  // Photo submission data (when part of instance)
  file_name?: string;
  file_url?: string;
  file_type?: 'image' | 'video';
  photo_created_at?: string;
  is_approved?: boolean;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SampleImageData {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'photo' | 'drawing' | 'bom' | 'schematic' | 'reference' | 'diagram';
  image_type?: 'sample' | 'reference' | 'defect_example' | 'diagram';  // NEW: categorization for display
  is_primary: boolean;
  order_index: number;
}

export interface SampleVideoData {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'video' | 'screen' | 'other';
  is_primary?: boolean;
  order_index?: number;
  duration_seconds?: number; // Video duration in seconds
}

export interface PhotoRequirements {
  angle?: string;
  distance?: string;
  lighting?: string;
  focus?: string;
  resolution?: string;
  format?: string[];
  max_photos?: number;
  min_photos?: number;
  picture_required?: boolean; // When false, users can just confirm without taking a photo
  submission_type?: 'photo' | 'video' | 'audio' | 'either' | 'none'; // NEW: Type of submission allowed (mutually exclusive)
  max_video_duration_seconds?: number; // NEW: Maximum allowed video duration in seconds (only used if submission_type includes video)
}

export interface VideoRequirements {
  submission_time_seconds?: number; // Per-item submission time limit in seconds (null/0 = no limit)
  max_video_duration_seconds?: number; // Maximum allowed video duration in seconds
}

export interface ChecklistInstance {
  id: number;
  template_id: number;
  template_name?: string;
  template_description?: string;
  template_version?: string;
  template_category?: string;
  work_order_number: string;
  part_number: string;
  serial_number: string;
  operator_id: number;
  operator_name: string;
  operator_image?: string; // User's profile image URL
  owner_id?: number | null;
  owner_name?: string | null;
  lock_expires_at?: string | null;
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'submitted';
  progress_percentage: number;
  item_completion?: any; // Persisted per-item completion/notes (JSON)
  photo_count?: number;
  required_items?: number;
  completed_required?: number;
  items?: ChecklistItem[]; // Template items (used by photos view, progress calc)
  media_by_item?: Array<{ item_id: number; photos: Array<{ file_url: string; file_type: string; capture_source?: string | null; created_at?: string | null }>; videos: Array<{ file_url: string; file_type: string; capture_source?: string | null; created_at?: string | null }> }>; // Photo submissions per item from DB
  started_at?: string;
  completed_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoSubmission {
  id: number;
  instance_id: number;
  item_id: number;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: 'image' | 'video';
  file_size: number;
  mime_type: string;
  photo_metadata?: any;
  submission_notes?: string;
  is_approved?: boolean;
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistConfig {
  config_key: string;
  config_value: string;
  description: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
}

@Injectable({
  providedIn: 'root'
})
export class PhotoChecklistConfigService {
  private readonly nestPhotoChecklistBaseUrl = 'apiV2/inspection-checklist';
  private readonly mediaApiBaseUrl = this.nestPhotoChecklistBaseUrl;
  
  // Reactive state management
  private templatesSubject = new BehaviorSubject<ChecklistTemplate[]>([]);
  private instancesSubject = new BehaviorSubject<ChecklistInstance[]>([]);
  private configSubject = new BehaviorSubject<{[key: string]: any}>({});
  
  public templates$ = this.templatesSubject.asObservable();
  public instances$ = this.instancesSubject.asObservable();
  public config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  // ==============================================
  // Template Management
  // ==============================================

  getTemplates(): Observable<ChecklistTemplate[]> {
    return this.http.get<ChecklistTemplate[]>(`${this.nestPhotoChecklistBaseUrl}/templates`).pipe(
      tap(templates => this.templatesSubject.next(templates))
    );
  }

  getTemplatesIncludingInactive(): Observable<ChecklistTemplate[]> {
    return this.http.get<ChecklistTemplate[]>(`${this.nestPhotoChecklistBaseUrl}/templates?include_inactive=1`).pipe(
      tap(templates => this.templatesSubject.next(templates))
    );
  }

  getTemplatesIncludingDeleted(): Observable<ChecklistTemplate[]> {
    return this.http.get<ChecklistTemplate[]>(`${this.nestPhotoChecklistBaseUrl}/templates?include_deleted=1`);
  }

  getTemplate(id: number): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(`${this.nestPhotoChecklistBaseUrl}/templates/${id}`);
  }

  getTemplateIncludingInactive(id: number): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(`${this.nestPhotoChecklistBaseUrl}/templates/${id}?include_inactive=1`);
  }

  getTemplateIncludingDeleted(id: number): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(`${this.nestPhotoChecklistBaseUrl}/templates/${id}?include_deleted=1`);
  }

  createTemplate(template: Partial<ChecklistTemplate>): Observable<{success: boolean, template_id: number, template?: ChecklistTemplate, debug?: any}> {
    return this.http.post<{success: boolean, template_id: number, template?: ChecklistTemplate, debug?: any}>(
      `${this.nestPhotoChecklistBaseUrl}/templates`,
      template
    ).pipe(
      tap((response) => {
        console.log('Backend response:', response);
        if (response.debug) {
          console.log('🐛 Debug info from backend:', response.debug);
        }
        this.getTemplates().subscribe();
      })
    );
  }

  updateTemplate(id: number, template: Partial<ChecklistTemplate>): Observable<{success: boolean, template_id?: number, template?: ChecklistTemplate}> {
    return this.http.put<{success: boolean, template_id?: number, template?: ChecklistTemplate}>(
      `${this.nestPhotoChecklistBaseUrl}/templates/${id}`,
      template
    ).pipe(
      tap(() => this.getTemplates().subscribe()) // Refresh templates list
    );
  }

  deleteTemplate(id: number): Observable<{success: boolean; error?: string; instance_count?: number; message?: string}> {
    return this.http.delete<{success: boolean; error?: string; instance_count?: number; message?: string}>(
      `${this.nestPhotoChecklistBaseUrl}/templates/${id}`
    ).pipe(
      tap(() => this.getTemplates().subscribe()) // Refresh templates list
    );
  }

  hardDeleteTemplate(id: number): Observable<{success: boolean; error?: string; instance_count?: number; submission_count?: number; child_count?: number; message?: string}> {
    return this.http.post<{success: boolean; error?: string; instance_count?: number; submission_count?: number; child_count?: number; message?: string}>(
      `${this.nestPhotoChecklistBaseUrl}/templates/${id}/hard-delete`,
      {}
    ).pipe(
      tap(() => this.getTemplatesIncludingInactive().subscribe())
    );
  }

  discardDraft(id: number): Observable<{success: boolean; error?: string; instance_count?: number; message?: string; template_id?: number}> {
    return this.http.post<{success: boolean; error?: string; instance_count?: number; message?: string; template_id?: number}>(
      `${this.nestPhotoChecklistBaseUrl}/templates/${id}/discard-draft`,
      {}
    ).pipe(
      tap(() => this.getTemplates().subscribe())
    );
  }

  createParentVersion(sourceTemplateId: number): Observable<{success: boolean; template_id?: number; template?: ChecklistTemplate; error?: string; message?: string}> {
    return this.http.post<{success: boolean; template_id?: number; template?: ChecklistTemplate; error?: string; message?: string}>(
      `${this.nestPhotoChecklistBaseUrl}/templates/${sourceTemplateId}/create-parent-version`,
      {}
    ).pipe(
      tap(() => this.getTemplatesIncludingInactive().subscribe())
    );
  }

  restoreTemplate(id: number): Observable<{success: boolean; message?: string; template_id?: number}> {
    return this.http.post<{success: boolean; message?: string; template_id?: number}>(
      `${this.nestPhotoChecklistBaseUrl}/templates/${id}/restore`,
      {}
    ).pipe(
      tap(() => this.getTemplates().subscribe())
    );
  }

  // Get version history for a template group
  getTemplateHistory(groupId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.nestPhotoChecklistBaseUrl}/templates/history?group_id=${groupId}`
    );
  }

  // Get version changes for a specific template
  getTemplateVersionChanges(templateId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.nestPhotoChecklistBaseUrl}/templates/history?template_id=${templateId}`
    );
  }

  // Compare two templates and get changes
  compareTemplates(sourceId: number, targetId: number): Observable<any> {
    return this.http.get<any>(
      `${this.nestPhotoChecklistBaseUrl}/templates/compare?source_id=${sourceId}&target_id=${targetId}`
    );
  }

  // ==============================================
  // Document Control Integration
  // ==============================================

  /**
   * Create a new checklist document with initial revision (Rev 1)
   * This integrates the template with the quality documents system
   */
  createChecklistDocument(data: {
    prefix: string;
    title: string;
    description?: string;
    department: 'QA' | 'ENG' | 'OPS' | 'MAINT';
    category: string;
    template_id: number;
    created_by: string;
    revision_description: string;
  }): Observable<{
    success: boolean;
    document_id: number;
    document_number: string;
    revision_id: number;
    revision_number: number;
    message: string;
  }> {
    return this.http.post<any>(
      'apiV2/checklist-document-control?action=create-document',
      data
    );
  }

  /**
   * Create a new revision for an existing checklist document
   * Called when editing a template that already has a document number
   */
  createChecklistRevision(data: {
    document_id: number;
    template_id: number;
    revision_description: string;
    changes_summary?: string;
    items_added?: number;
    items_removed?: number;
    items_modified?: number;
    changes_detail?: any;
    created_by: string;
  }): Observable<{
    success: boolean;
    revision_id: number;
    revision_number: number;
    document_number: string;
    message: string;
  }> {
    return this.http.post<any>(
      'apiV2/checklist-document-control?action=create-revision',
      data
    );
  }

  /**
   * Approve a checklist revision
   */
  approveChecklistRevision(data: {
    revision_id: number;
    approved_by: string;
  }): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.post<any>(
      'apiV2/checklist-document-control?action=approve-revision',
      data
    );
  }

  /**
   * Get revision history for a document
   */
  getRevisionHistory(documentId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `apiV2/checklist-document-control?action=get-revision-history&document_id=${documentId}`
    );
  }

  // ==============================================
  // Instance Management
  // ==============================================

  getInstances(filters?: {status?: string, work_order?: string}): Observable<ChecklistInstance[]> {
    let url = `${this.nestPhotoChecklistBaseUrl}/instances`;
    
    const params: string[] = [];
    if (filters?.status) {
      params.push(`status=${encodeURIComponent(filters.status)}`);
    }
    if (filters?.work_order) {
      params.push(`work_order=${encodeURIComponent(filters.work_order)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return this.http.get<ChecklistInstance[]>(url).pipe(
      tap(instances => this.instancesSubject.next(instances))
    );
  }

  // Search instances for audit purposes
  searchInstances(criteria: {
    partNumber?: string;
    serialNumber?: string;
    workOrderNumber?: string;
    templateName?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    operator?: string;
  }): Observable<ChecklistInstance[]> {
    let url = `${this.nestPhotoChecklistBaseUrl}/instances/search`;
    const params: string[] = [];
    
    if (criteria.partNumber) {
      params.push(`part_number=${encodeURIComponent(criteria.partNumber)}`);
    }
    if (criteria.serialNumber) {
      params.push(`serial_number=${encodeURIComponent(criteria.serialNumber)}`);
    }
    if (criteria.workOrderNumber) {
      params.push(`work_order=${encodeURIComponent(criteria.workOrderNumber)}`);
    }
    if (criteria.templateName) {
      params.push(`template_name=${encodeURIComponent(criteria.templateName)}`);
    }
    if (criteria.dateFrom) {
      params.push(`date_from=${criteria.dateFrom}`);
    }
    if (criteria.dateTo) {
      params.push(`date_to=${criteria.dateTo}`);
    }
    if (criteria.status) {
      params.push(`status=${criteria.status}`);
    }
    if (criteria.operator) {
      params.push(`operator=${encodeURIComponent(criteria.operator)}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return this.http.get<ChecklistInstance[]>(url);
  }

  getInstance(id: number): Observable<ChecklistInstance> {
    return this.http.get<ChecklistInstance>(`${this.nestPhotoChecklistBaseUrl}/instances/${id}`);
  }

  createInstance(instance: Partial<ChecklistInstance>): Observable<{success: boolean, instance_id: number}> {
    return this.http.post<{success: boolean, instance_id: number}>(
      `${this.nestPhotoChecklistBaseUrl}/instances`,
      instance
    ).pipe(
      tap(() => this.getInstances().subscribe()) // Refresh instances list
    );
  }

  updateInstance(id: number, updates: Partial<ChecklistInstance>): Observable<{success: boolean}> {
    return this.http.put<{success: boolean}>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${id}`,
      updates
    ).pipe(
      tap(() => this.getInstances().subscribe()) // Refresh instances list
    );
  }

  updateInstanceItemCompletion(
    instanceId: number,
    itemId: number,
    // Keep creator identity immutable after creation: do not include operator_id/operator_name in update payloads.
    payload: {
      completion: any;
      progress_percentage?: number;
      status?: ChecklistInstance['status'];
      updated_at?: string;
    }
  ): Observable<{ success: boolean; instance_id?: number; item_id?: number; error?: string }> {
    return this.http.post<{ success: boolean; instance_id?: number; item_id?: number; error?: string }>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${instanceId}/item-completion`,
      {
        item_id: itemId,
        ...payload,
      }
    );
  }

  updateInstanceStatus(id: number, status: ChecklistInstance['status']): Observable<{success: boolean}> {
    return this.updateInstance(id, { status });
  }

  deleteInstance(id: number): Observable<{success: boolean; message?: string; error?: string}> {
    return this.http.delete<{success: boolean; message?: string; error?: string}>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${id}`
    ).pipe(
      tap(() => this.getInstances().subscribe())
    );
  }

  // Owner-lock operations

  claimInstance(id: number, userName: string): Observable<{ success: boolean; owner_id?: number; owner_name?: string; message?: string }> {
    return this.http.post<{ success: boolean; owner_id?: number; owner_name?: string; message?: string }>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${id}/claim`,
      { user_name: userName },
    );
  }

  releaseInstance(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${id}/release`,
      {},
    );
  }

  heartbeatInstance(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${id}/heartbeat`,
      {},
    );
  }

  transferInstance(id: number, toUserId: number, toUserName: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.nestPhotoChecklistBaseUrl}/instances/${id}/transfer`,
      { to_user_id: toUserId, to_user_name: toUserName },
    );
  }

  // ==============================================
  // Photo Management
  // ==============================================

  uploadPhoto(
    instanceId: number,
    itemId: number,
    file: File,
    options?: { captureSource?: 'in-app' | 'system' | 'library'; userId?: number | string }
  ): Observable<{success: boolean, file_url: string, media?: { id: number | null; item_id: number | null; file_url: string; file_type: 'image' | 'video'; file_name: string; created_at: string | null }}> {
    // Add validation in the service as a safety net
    if (!instanceId || instanceId <= 0) {
      throw new Error(`Invalid instanceId: ${instanceId}`);
    }
    
    if (!itemId || itemId <= 0) {
      throw new Error(`Invalid itemId: ${itemId}`);
    }
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    const formData = new FormData();
    formData.append('instance_id', instanceId.toString());
    formData.append('item_id', itemId.toString());
    formData.append('photo', file);

    if (options?.captureSource) {
      formData.append('capture_source', options.captureSource);
    }
    if (options?.userId !== undefined && options?.userId !== null) {
      formData.append('user_id', String(options.userId));
    }

    return this.http.post<{success: boolean, file_url: string, media?: { id: number | null; item_id: number | null; file_url: string; file_type: 'image' | 'video'; file_name: string; created_at: string | null }}>(
      `${this.mediaApiBaseUrl}/media/upload`, 
      formData
    );
  }

  deletePhoto(photoId: number): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(
      `${this.mediaApiBaseUrl}/media/${photoId}`
    );
  }

  deleteMediaByLocator(instanceId: number, itemId: number, fileUrl: string): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(
      `${this.mediaApiBaseUrl}/media/delete-by-locator`,
      {
        instance_id: instanceId,
        item_id: itemId,
        file_url: fileUrl
      }
    );
  }

  deleteOwnMedia(instanceId: number, itemId: number, fileUrl: string, userId: number): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(
      `${this.mediaApiBaseUrl}/media/delete-own`,
      { instance_id: instanceId, item_id: itemId, file_url: fileUrl },
      { headers: { 'x-user-id': String(userId) } }
    );
  }

  // ==============================================
  // Configuration Management
  // ==============================================

  private loadConfig(): void {
    this.http.get<ChecklistConfig[]>(`${this.nestPhotoChecklistBaseUrl}/config`).subscribe(
      configArray => {
        const config: {[key: string]: any} = {};
        configArray.forEach(item => {
          let value: any = item.config_value;
          
          switch (item.config_type) {
            case 'number':
              value = parseFloat(value);
              break;
            case 'boolean':
              value = value === 'true' || value === '1';
              break;
            case 'json':
              try {
                value = JSON.parse(value);
              } catch (e) {
                console.warn(`Failed to parse JSON config: ${item.config_key}`, e);
              }
              break;
          }
          
          config[item.config_key] = value;
        });
        
        this.configSubject.next(config);
      }
    );
  }

  getConfig(): Observable<{[key: string]: any}> {
    return this.config$;
  }

  getConfigValue(key: string): any {
    return this.configSubject.value[key];
  }

  updateConfig(updates: {[key: string]: any}): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(
      `${this.nestPhotoChecklistBaseUrl}/config`,
      updates
    ).pipe(
      tap(() => this.loadConfig()) // Refresh config
    );
  }

  // ==============================================
  // Legacy Compatibility Methods (migrated to NestJS)
  // ==============================================

  readByPartNumber(woNumber: string, partNumber: string, serialNumber: string, _typeOfView?: string): Observable<ChecklistInstance | undefined> {
    return this.searchInstances({ workOrderNumber: woNumber, partNumber, serialNumber }).pipe(
      map(results => results[0])
    );
  }

  getOpenChecklists(): Observable<ChecklistInstance[]> {
    return this.getInstances();
  }

  // ==============================================
  // Utility Methods
  // ==============================================

  /**
   * Create a new checklist instance from a template
   */
  createInstanceFromTemplate(templateId: number, workOrder: string, partNumber?: string, serialNumber?: string, operatorInfo?: {id?: number, name?: string}): Observable<{success: boolean, instance_id: number}> {
    return this.createInstance({
      template_id: templateId,
      work_order_number: workOrder,
      part_number: partNumber || '',
      serial_number: serialNumber || '',
      operator_id: operatorInfo?.id,
      operator_name: operatorInfo?.name || '',
      status: 'draft'
    });
  }

  /**
   * Get templates by part number or product type
   */
  getTemplatesForPart(partNumber: string): Observable<ChecklistTemplate[]> {
    return this.getTemplates().pipe(
      map(templates => templates.filter(t => 
        t.part_number === partNumber || 
        t.part_number === 'GENERIC' ||
        t.product_type.toLowerCase().includes(partNumber.toLowerCase())
      ))
    );
  }

  /**
   * Calculate completion percentage for an instance
   */
  calculateProgress(instance: ChecklistInstance): number {
    if (!instance.items || instance.items.length === 0) {
      return 0;
    }

    const requiredItems = instance.items.filter(item => item.is_required);
    const completedRequired = requiredItems.filter(item => item.file_url);
    
    return Math.round((completedRequired.length / requiredItems.length) * 100);
  }

  /**
   * Check if instance is ready for submission
   */
  isReadyForSubmission(instance: ChecklistInstance): boolean {
    if (!instance.items) return false;
    
    const requiredItems = instance.items.filter(item => item.is_required);
    const completedRequired = requiredItems.filter(item => item.file_url);
    
    return completedRequired.length === requiredItems.length;
  }

  /**
   * Get validation messages for an instance
   */
  getValidationMessages(instance: ChecklistInstance): string[] {
    const messages: string[] = [];
    
    if (!instance.items) {
      messages.push('No checklist items found');
      return messages;
    }

    const requiredItems = instance.items.filter(item => item.is_required);
    const missingPhotos = requiredItems.filter(item => !item.file_url);
    
    if (missingPhotos.length > 0) {
      messages.push(`${missingPhotos.length} required photo(s) missing`);
      missingPhotos.forEach(item => {
        messages.push(`- ${item.title}`);
      });
    }

    return messages;
  }

  /**
   * Download instance data for PDF generation
   */
  downloadInstancePDF(instanceId: number): Observable<any> {
    return this.http.get<any>(`${this.nestPhotoChecklistBaseUrl}/instances/${instanceId}/export`);
  }

  // ==============================================
  // Share Report / Public Links
  // ==============================================

  private readonly reportUrl = 'apiv2/inspection-checklist';

  createShareToken(payload: {
    instance_id: number;
    visible_item_ids: number[] | null;
    label?: string;
    expires_at?: string | null;
  }): Observable<{ success: boolean; token: string; expires_at: string | null; label: string }> {
    return this.http.post<any>(`${this.reportUrl}/share-tokens`, payload);
  }

  listShareTokens(instanceId: number): Observable<{ success: boolean; tokens: any[] }> {
    return this.http.get<any>(`${this.reportUrl}/share-tokens?instance_id=${instanceId}`);
  }

  deleteShareToken(id: number): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${this.reportUrl}/share-tokens/${id}`);
  }

  getPublicReport(token: string): Observable<any> {
    return this.http.get<any>(`${this.reportUrl}/share-report/${encodeURIComponent(token)}`);
  }
}
