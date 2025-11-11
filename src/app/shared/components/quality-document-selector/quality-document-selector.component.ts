import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { QualityVersionControlService, QualityDocument, QualityRevision } from '../../../core/api/quality-version-control/quality-version-control.service';

export interface QualityDocumentSelection {
  documentId: number;
  revisionId: number;
  documentNumber: string; // e.g., "QA-FRM-202"
  versionString: string; // e.g., "QA-FRM-202, rev2"
  title: string;
  revisionNumber: number;
}

@Component({
  selector: 'app-quality-document-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QualityDocumentSelectorComponent),
      multi: true
    }
  ],
  template: `
    <div class="quality-document-selector">
      <!-- Document Type Filter (Optional) -->
      <div class="row mb-3" *ngIf="showTypeFilter">
        <div class="col-md-6 mb-3">
          <label class="form-label">Document Type</label>
          <select class="form-select" 
                  [(ngModel)]="selectedType" 
                  (ngModelChange)="onTypeChange()">
            <option value="">All Types</option>
            <option value="FRM">Forms (FRM)</option>
            <option value="SOP">Standard Operating Procedures (SOP)</option>
            <option value="CHK">Checklists (CHK)</option>
            <option value="INS">Instructions (INS)</option>
            <option value="QCP">Quality Control Plans (QCP)</option>
            <option value="WI">Work Instructions (WI)</option>
          </select>
          <div class="form-text">
            <i class="mdi mdi-information-outline me-1"></i>
            Filter documents by type category.
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <label class="form-label">Category</label>
          <select class="form-select" 
                  [(ngModel)]="selectedCategory" 
                  (ngModelChange)="onCategoryChange()">
            <option value="">All Categories</option>
            <option value="quality_control">Quality Control</option>
            <option value="training">Training</option>
            <option value="process">Process</option>
            <option value="safety">Safety</option>
            <option value="compliance">Compliance</option>
          </select>
          <div class="form-text">
            <i class="mdi mdi-information-outline me-1"></i>
            Filter documents by functional category.
          </div>
        </div>
      </div>

      <!-- Document Selection -->
      <div class="mb-3">
        <label class="form-label">
          {{label || 'Quality Document'}}
        </label>
        
        <div class="input-group">
          <select class="form-select" 
                  [(ngModel)]="selectedDocumentId" 
                  (ngModelChange)="onDocumentChange()"
                  [class.is-invalid]="invalid"
                  [disabled]="disabled || loading">
            <option value="">{{placeholder || 'Select a quality document...'}}</option>
            <option *ngFor="let doc of filteredDocuments; trackBy: trackByDocumentId" 
                    [value]="doc.id">
              {{doc.document_number}} - {{doc.title}}
              <span class="text-muted">({{getDocumentType(doc)}})</span>
            </option>
          </select>
          
          <button class="btn btn-outline-secondary" 
                  type="button" 
                  (click)="refreshDocuments()"
                  [disabled]="loading"
                  title="Refresh documents">
            <i class="mdi" [class]="loading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
          </button>
        </div>
        
        <div class="form-text" *ngIf="helpText">
          <i class="mdi mdi-information-outline me-1"></i>
          {{helpText}}
        </div>
        
        <div class="invalid-feedback" *ngIf="invalid">
          Please select a quality document
        </div>
      </div>

      <!-- Loading State -->
      <div class="text-center py-3" *ngIf="loading">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        <span class="text-muted">Loading quality documents...</span>
      </div>

      <!-- Selected Document Preview -->
      <div class="card border-primary" *ngIf="selectedDocument">
        <div class="card-header bg-primary text-white py-2">
          <h6 class="mb-0">
            <i class="mdi mdi-file-check-outline me-2"></i>
            Selected Document
          </h6>
        </div>
        <div class="card-body p-3">
          <div class="row">
            <div class="col-md-8">
              <h6 class="text-primary mb-1">{{getVersionString(selectedDocument)}}</h6>
              <p class="mb-2">{{selectedDocument.title}}</p>
              <p class="text-muted small mb-2" *ngIf="selectedDocument.description">
                {{selectedDocument.description}}
              </p>
              <p class="text-muted small mb-0" *ngIf="selectedDocument.current_revision_description">
                <strong>Current Revision:</strong> {{selectedDocument.current_revision_description}}
              </p>
            </div>
            <div class="col-md-4">
              <div class="text-end">
                <span class="badge" [class]="getStatusBadgeClass(selectedDocument.status)">
                  {{selectedDocument.status | titlecase}}
                </span>
                <div class="small text-muted mt-1">
                  Rev {{selectedDocument.current_revision}}
                </div>
                <div class="small text-muted" *ngIf="selectedDocument.current_revision_created_at">
                  {{selectedDocument.current_revision_created_at | date:'shortDate'}}
                </div>
                <div class="small text-muted">
                  Dept: {{selectedDocument.department}}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div class="alert alert-warning d-flex align-items-center" *ngIf="error">
        <i class="mdi mdi-alert-circle-outline me-2"></i>
        <div>
          <strong>Error loading documents:</strong> {{error}}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quality-document-selector .form-select {
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }
    
    .quality-document-selector .form-select:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
    
    .quality-document-selector .card {
      transition: all 0.2s ease;
    }
    
    .quality-document-selector .badge {
      font-size: 0.75rem;
    }
    
    .mdi-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .text-success option {
      font-weight: 600;
    }
  `]
})
export class QualityDocumentSelectorComponent implements OnInit, ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() helpText: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() invalid: boolean = false;
  @Input() showTypeFilter: boolean = true;
  @Input() allowedTypes: string[] = []; // Restrict to specific document types (FRM, SOP, CHK, etc.)
  @Input() allowedCategories: string[] = []; // Restrict to specific categories
  @Input() showOnlyApproved: boolean = false; // Only show approved documents

  @Output() selectionChange = new EventEmitter<QualityDocumentSelection | null>();
  @Output() documentChange = new EventEmitter<QualityDocument | null>();

  // Data
  documents: QualityDocument[] = [];
  filteredDocuments: QualityDocument[] = [];
  selectedDocument: QualityDocument | null = null;

  // Form state
  selectedDocumentId: string = '';
  selectedType: string = '';
  selectedCategory: string = '';

  // UI state
  loading: boolean = false;
  error: string = '';

  // ControlValueAccessor
  private onChange = (value: QualityDocumentSelection | null) => {};
  private onTouched = () => {};

  constructor(private qualityService: QualityVersionControlService) {}

  ngOnInit() {
    this.loadDocuments();
  }

  // ControlValueAccessor Implementation
  writeValue(value: QualityDocumentSelection | null): void {
    if (value) {
      this.selectedDocumentId = value.documentId.toString();
      // Find and set the selected document (handle both string and numeric IDs)
      const doc = this.documents.find(d => d.id.toString() === value.documentId.toString());
      if (doc) {
        this.selectedDocument = doc;
      }
    } else {
      this.selectedDocumentId = '';
      this.selectedDocument = null;
    }
  }

  registerOnChange(fn: (value: QualityDocumentSelection | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Data Loading
  loadDocuments() {
    this.loading = true;
    this.error = '';

    const params: any = {};
    if (this.selectedType) params.type = this.selectedType;
    if (this.selectedCategory) params.category = this.selectedCategory;

    console.log('🔍 Quality Document Selector - Loading documents with params:', params);

    this.qualityService.getDocuments(params).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Quality Document Selector: Error loading documents:', error);
        this.error = 'Failed to load quality documents';
        this.loading = false;
      }
    });
  }

  // Filter Logic
  applyFilters() {
    this.filteredDocuments = this.documents.filter(doc => {
      const docType = this.getDocumentType(doc);
      const docCategory = this.getDocumentCategory(doc);
      
      // User-selected type filter from dropdown
      if (this.selectedType && docType !== this.selectedType) {
        return false;
      }
      
      // User-selected category filter from dropdown
      if (this.selectedCategory && docCategory !== this.selectedCategory) {
        return false;
      }
      
      // Component input allowedTypes filter (restrictions from parent component)
      if (this.allowedTypes.length > 0 && !this.allowedTypes.includes(docType)) {
        return false;
      }
      
      // Component input allowedCategories filter (restrictions from parent component)
      if (this.allowedCategories.length > 0 && !this.allowedCategories.includes(docCategory)) {
        return false;
      }
      
      // Status filter for approved documents
      if (this.showOnlyApproved && doc.status !== 'approved') {
        return false;
      }
      
      return true;
    });
  }

  // Event Handlers
  onTypeChange() {
    this.selectedDocumentId = '';
    this.selectedDocument = null;
    this.applyFilters(); // Filter existing documents instead of reloading
  }

  onCategoryChange() {
    this.selectedDocumentId = '';
    this.selectedDocument = null;
    this.applyFilters(); // Filter existing documents instead of reloading
  }

  onDocumentChange() {
    this.onTouched();
    
    if (this.selectedDocumentId) {
      // Handle both string and numeric IDs
      const selectedId = this.selectedDocumentId;
      this.selectedDocument = this.documents.find(d => d.id.toString() === selectedId) || null;
      
      if (this.selectedDocument) {
        const selection = this.createDocumentSelection(this.selectedDocument);
        this.onChange(selection);
        this.selectionChange.emit(selection);
        this.documentChange.emit(this.selectedDocument);
      }
    } else {
      this.selectedDocument = null;
      this.documentChange.emit(null);
      this.onChange(null);
      this.selectionChange.emit(null);
    }
  }

  refreshDocuments() {
    this.loadDocuments();
  }

  // Utility Methods
  trackByDocumentId(index: number, doc: QualityDocument): string | number {
    return doc.id;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'review': return 'bg-info';
      case 'draft': return 'bg-warning';
      case 'superseded': return 'bg-secondary';
      case 'obsolete': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  // Helper methods for working with the API data structure
  getDocumentType(doc: QualityDocument): string {
    // Extract document type from prefix (e.g., "QA-FRM" -> "FRM")
    return doc.prefix ? doc.prefix.split('-').pop() || 'DOC' : 'DOC';
  }

  getDocumentCategory(doc: QualityDocument): string {
    // Map document types to categories
    const type = this.getDocumentType(doc);
    switch (type) {
      case 'FRM':
      case 'CHK':
      case 'QCP':
        return 'quality_control';
      case 'SOP':
      case 'WI':
        return 'process';
      case 'INS':
        return 'training';
      default:
        return 'quality_control';
    }
  }

  getVersionString(doc: QualityDocument): string {
    // Create version string like "QA-FRM-202, rev2"
    return `${doc.document_number}, rev${doc.current_revision}`;
  }

  // Convert API document to QualityDocumentSelection
  createDocumentSelection(doc: QualityDocument): QualityDocumentSelection {
    const documentId = typeof doc.id === 'string' ? parseInt(doc.id) : doc.id;
    const revisionNumber = typeof doc.current_revision === 'string' ? parseInt(doc.current_revision) : doc.current_revision;
    
    return {
      documentId: documentId,
      revisionId: revisionNumber, // Using current revision number as revision ID
      documentNumber: doc.document_number,
      versionString: this.getVersionString(doc),
      title: doc.title,
      revisionNumber: revisionNumber
    };
  }
}
