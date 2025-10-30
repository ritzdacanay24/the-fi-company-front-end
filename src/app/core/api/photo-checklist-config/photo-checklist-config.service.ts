import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

// ==============================================
// Interfaces
// ==============================================

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string;
  part_number: string;
  product_type: string;
  category: 'quality_control' | 'installation' | 'maintenance' | 'inspection';
  version: string;
  is_active: boolean;
  active_instances?: number;
  item_count?: number;
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

export interface ChecklistItem {
  id: number;
  template_id: number;
  order_index: number;
  title: string;
  description: string;
  photo_requirements: PhotoRequirements;
  sample_images: SampleImageData[];
  sample_image_url?: string; // Single image URL field
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
  is_primary: boolean;
  order_index: number;
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
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'submitted';
  progress_percentage: number;
  photo_count?: number;
  required_items?: number;
  completed_required?: number;
  items?: ChecklistItem[];
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
  private readonly baseUrl = '/photo-checklist/photo-checklist-config.php';
  
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
    return this.http.get<ChecklistTemplate[]>(`${this.baseUrl}?request=templates`).pipe(
      tap(templates => this.templatesSubject.next(templates))
    );
  }

  getTemplate(id: number): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(`${this.baseUrl}?request=template&id=${id}`);
  }

  createTemplate(template: Partial<ChecklistTemplate>): Observable<{success: boolean, template_id: number}> {
    return this.http.post<{success: boolean, template_id: number}>(
      `${this.baseUrl}?request=templates`, 
      template
    ).pipe(
      tap(() => this.getTemplates().subscribe()) // Refresh templates list
    );
  }

  updateTemplate(id: number, template: Partial<ChecklistTemplate>): Observable<{success: boolean}> {
    return this.http.put<{success: boolean}>(
      `${this.baseUrl}?request=template&id=${id}`, 
      template
    ).pipe(
      tap(() => this.getTemplates().subscribe()) // Refresh templates list
    );
  }

  deleteTemplate(id: number): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(
      `${this.baseUrl}?request=template&id=${id}`
    ).pipe(
      tap(() => this.getTemplates().subscribe()) // Refresh templates list
    );
  }

  // ==============================================
  // Instance Management
  // ==============================================

  getInstances(filters?: {status?: string, work_order?: string}): Observable<ChecklistInstance[]> {
    let url = `${this.baseUrl}?request=instances`;
    
    if (filters?.status) {
      url += `&status=${filters.status}`;
    }
    if (filters?.work_order) {
      url += `&work_order=${filters.work_order}`;
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
    let url = `${this.baseUrl}?request=search_instances`;
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
      url += '&' + params.join('&');
    }
    
    return this.http.get<ChecklistInstance[]>(url);
  }

  getInstance(id: number): Observable<ChecklistInstance> {
    return this.http.get<ChecklistInstance>(`${this.baseUrl}?request=instance&id=${id}`);
  }

  createInstance(instance: Partial<ChecklistInstance>): Observable<{success: boolean, instance_id: number}> {
    return this.http.post<{success: boolean, instance_id: number}>(
      `${this.baseUrl}?request=instances`, 
      instance
    ).pipe(
      tap(() => this.getInstances().subscribe()) // Refresh instances list
    );
  }

  updateInstance(id: number, updates: Partial<ChecklistInstance>): Observable<{success: boolean}> {
    return this.http.put<{success: boolean}>(
      `${this.baseUrl}?request=instance&id=${id}`, 
      updates
    ).pipe(
      tap(() => this.getInstances().subscribe()) // Refresh instances list
    );
  }

  updateInstanceStatus(id: number, status: ChecklistInstance['status']): Observable<{success: boolean}> {
    return this.updateInstance(id, { status });
  }

  // ==============================================
  // Photo Management
  // ==============================================

  uploadPhoto(instanceId: number, itemId: number, file: File): Observable<{success: boolean, file_url: string}> {
    // Add debugging to see what values are actually received
    console.log('PhotoChecklistConfigService.uploadPhoto called with:', {
      instanceId: instanceId,
      itemId: itemId,
      file: file,
      instanceIdType: typeof instanceId,
      itemIdType: typeof itemId,
      instanceIdIsNull: instanceId === null,
      instanceIdIsUndefined: instanceId === undefined,
      instanceIdValue: instanceId
    });
    
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

    return this.http.post<{success: boolean, file_url: string}>(
      `${this.baseUrl}?request=photos`, 
      formData
    );
  }

  deletePhoto(photoId: number): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(
      `${this.baseUrl}?request=photo&id=${photoId}`
    );
  }

  // ==============================================
  // Configuration Management
  // ==============================================

  private loadConfig(): void {
    this.http.get<ChecklistConfig[]>(`${this.baseUrl}?request=config`).subscribe(
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
      `${this.baseUrl}?request=config`, 
      updates
    ).pipe(
      tap(() => this.loadConfig()) // Refresh config
    );
  }

  // ==============================================
  // Legacy Compatibility Methods
  // ==============================================

  readByPartNumber(woNumber: string, partNumber: string, serialNumber: string, typeOfView?: string): Observable<any> {
    return this.http.get(`${this.baseUrl}?request=read&woNumber=${woNumber}&partNumber=${partNumber}&serialNumber=${serialNumber}&typeOfView=${typeOfView || ''}`);
  }

  getOpenChecklists(): Observable<ChecklistInstance[]> {
    return this.http.get<ChecklistInstance[]>(`${this.baseUrl}?request=read&getOpenChecklists=true`);
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
}
