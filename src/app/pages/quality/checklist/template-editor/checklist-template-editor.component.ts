import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ViewChildren, TemplateRef, ChangeDetectorRef, ElementRef, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { QuillModule, QuillModules } from 'ngx-quill';
import Quill from 'quill';

import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { UploadService } from '@app/core/api/upload/upload.service';
import { PhotoChecklistUploadService } from '@app/core/api/photo-checklist/photo-checklist-upload.service';
import { QualityDocumentSelectorComponent, QualityDocumentSelection } from '@app/shared/components/quality-document-selector/quality-document-selector.component';
import { PdfParserService } from './services/pdf-parser.service';
import { WordParserService } from './services/word-parser.service';
import { RevisionDescriptionDialogComponent } from './components/revision-description-dialog.component';

interface SampleImage {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'photo' | 'drawing' | 'bom' | 'schematic' | 'reference' | 'diagram';
  image_type?: 'sample' | 'reference' | 'defect_example' | 'diagram';  // NEW: categorization for display
  is_primary: boolean;
  order_index: number;
  status?: 'loading' | 'loaded' | 'error';
}

interface SampleVideo {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'video' | 'screen' | 'other';
  is_primary: boolean;
  order_index: number;
  status?: 'loading' | 'loaded' | 'error';
  duration_seconds?: number | null;
}

interface ItemLink {
  title: string;
  url: string;
  description?: string;
}

@Component({
  selector: 'app-checklist-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, DragDropModule, QualityDocumentSelectorComponent, RouterModule, QuillModule],
  template: `
    <div class="container-fluid">
      <div class="print-hide">
        <div class="row">
          <div class="col-12">
          
          <!-- Breadcrumb Navigation -->
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a [routerLink]="['/quality']">Quality</a>
              </li>
              <li class="breadcrumb-item">
                <a [routerLink]="['/quality/template-manager']">Template Manager</a>
              </li>
              <li class="breadcrumb-item active" aria-current="page">
                {{editingTemplate ? 'Edit Template' : 'Create Template'}}
              </li>
            </ol>
          </nav>

          <!-- Page Header with Context -->
          <div class="mb-4">
              <div class="d-flex align-items-center mb-3">
              <button 
                type="button" 
                class="btn btn-outline-secondary me-3"
                [routerLink]="['/quality/template-manager']"
                title="Back to Template Manager">
                <i class="mdi mdi-arrow-left me-2"></i>Back
              </button>
              <button 
                type="button" 
                class="btn btn-outline-primary me-3"
                (click)="openImportModal()"
                title="Import from PDF or CSV"
                *ngIf="!editingTemplate">
                <i class="mdi mdi-file-import me-2"></i>Import
              </button>
              <button 
                type="button" 
                class="btn btn-outline-info me-3"
                (click)="openPreviewModal()"
                title="Preview Template"
                *ngIf="items.length > 0">
                <i class="mdi mdi-eye me-2"></i>Preview
              </button>
              <button 
                type="button" 
                class="btn btn-outline-dark me-3"
                (click)="printChecklist()"
                title="Print Template PDF"
                *ngIf="items.length > 0">
                <i class="mdi mdi-printer me-2"></i>Print Template
              </button>
              <div class="bg-primary bg-gradient rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                <i class="mdi mdi-clipboard-edit-outline text-white fs-4"></i>
              </div>
              <div>
                <h2 class="mb-1 text-primary">{{editingTemplate ? 'Edit Checklist Template' : 'Create Checklist Template'}}</h2>
                <p class="text-muted mb-0" *ngIf="editingTemplate">
                  {{editingTemplate.name}} - Version {{editingTemplate.version}}
                  <span *ngIf="editingTemplate.quality_document_metadata" class="badge bg-info text-dark ms-2">
                    <i class="mdi mdi-file-document me-1"></i>
                    {{editingTemplate.quality_document_metadata.document_number}}, Rev {{editingTemplate.quality_document_metadata.revision_number}}
                  </span>
                  <span *ngIf="lastSavedAt" class="badge bg-success ms-2">
                    <i class="mdi mdi-check-circle me-1"></i>Auto-saved at {{lastSavedAt | date:'shortTime'}}
                  </span>
                </p>
                <p class="text-muted mb-0" *ngIf="!editingTemplate">
                  Create a new photo checklist template with customizable inspection items
                </p>
              </div>
            </div>
            
            <!-- Versioning Warning for Editing Existing Template -->
            <div class="alert alert-warning border-warning border-opacity-25 bg-warning bg-opacity-10" role="alert" *ngIf="editingTemplate && !autoSaveEnabled">
              <div class="d-flex align-items-start">
                <i class="mdi mdi-alert text-warning me-3 mt-1 fs-5"></i>
                <div>
                  <h6 class="alert-heading text-warning mb-2">Version Notice</h6>
                  <p class="mb-2">
                    Editing this template will create a <strong>new version</strong>. Previous versions will remain available for reference.
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Auto-Save Info for Imported Templates -->
            <div class="alert alert-info border-info border-opacity-25 bg-info bg-opacity-10" role="alert" *ngIf="autoSaveEnabled">
              <div class="d-flex align-items-start">
                <i class="mdi mdi-information text-info me-3 mt-1 fs-5"></i>
                <div>
                  <h6 class="alert-heading text-info mb-2">Auto-Save Enabled</h6>
                  <p class="mb-0">
                    Your changes are being <strong>automatically saved</strong> as you edit. You can continue making changes and they will be saved every few seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content with Navigation Sidebar -->
          <div class="row">
            <!-- Main Form Card -->
            <div [ngClass]="items.length > 0 ? 'col-12 col-md-8 col-lg-8' : 'col-12'">
              <div class="card shadow-sm border-0">
                <div [formGroup]="templateForm">
                  <div class="card-body p-4">
              
                    <!-- Template Basic Information Section -->
                    <div class="mb-4 pb-4 border-bottom">
                      <div class="mb-3">
                        <h3 class="h5 mb-1">Template Information</h3>
                        <p class="text-muted mb-0">
                          Basic template details and categorization for the checklist.
                        </p>
                      </div>

                      <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Template Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" formControlName="name" 
                           placeholder="Enter template name"
                           [ngClass]="{ 'is-invalid': templateForm.get('name')?.invalid && templateForm.get('name')?.touched }">
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      A descriptive name for this checklist template.
                    </div>
                    <div class="invalid-feedback" *ngIf="templateForm.get('name')?.invalid && templateForm.get('name')?.touched">
                      Template name is required
                    </div>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Category <span class="text-danger">*</span></label>
                    <select class="form-select" formControlName="category"
                            [ngClass]="{ 'is-invalid': templateForm.get('category')?.invalid && templateForm.get('category')?.touched }">
                      <option value="">Select a category</option>
                      <option value="quality_control">Quality Control</option>
                      <option value="installation">Installation</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inspection">Inspection</option>
                    </select>
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Categorize the template for organization and filtering.
                    </div>
                    <div class="invalid-feedback" *ngIf="templateForm.get('category')?.invalid && templateForm.get('category')?.touched">
                      Category is required
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Part Number</label>
                    <input type="text" class="form-control" formControlName="part_number" placeholder="Enter part number">
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Optional part number reference for this template.
                    </div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Product Type</label>
                    <input type="text" class="form-control" formControlName="product_type" placeholder="Enter product type">
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Product type or classification for this template.
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Max Upload Size (MB)</label>
                    <input type="number" class="form-control" formControlName="max_upload_size_mb" min="1" placeholder="Leave empty for defaults">
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Optional per-template override for maximum upload file size (MB). If empty, images default to 5MB and videos to 50MB.
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" formControlName="disable_max_upload_limit" id="disableMaxUpload">
                      <label class="form-check-label" for="disableMaxUpload"><strong>Disable Max Upload Size</strong></label>
                    </div>
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      When enabled, client-side file size limits are disabled for this template. Server should still enforce limits if desired.
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-12 mb-3">
                    <label class="form-label">Description <span class="text-danger">*</span></label>
                    <div class="border rounded" [ngClass]="{ 'border-danger border-2': templateForm.get('description')?.invalid && templateForm.get('description')?.touched }">
                      <quill-editor 
                        formControlName="description" 
                        [modules]="quillConfig"
                        (onContentChanged)="onQuillContentChanged($event)"
                        placeholder="Enter template description"
                        class="quill-auto-height quill-template">
                      </quill-editor>
                    </div>
                    <div class="text-danger small mt-1" *ngIf="templateForm.get('description')?.invalid && templateForm.get('description')?.touched">
                      Description is required
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quality Document Section -->
              <div class="mb-4 pb-4 border-bottom">
                <div class="mb-3">
                  <h3 class="h5 mb-1">Quality Document Reference</h3>
                  <p class="text-muted mb-0">
                    Optional quality document association for this template.
                  </p>
                </div>
                
                <div class="row">
                  <div class="col-md-12 mb-3">
                    <label class="form-label">Associated Quality Document</label>
                    <app-quality-document-selector 
                      (selectionChange)="onQualityDocumentSelected($event)">
                    </app-quality-document-selector>
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Link this template to a quality document for reference and compliance tracking.
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Template Status Section -->
              <div class="mb-4">
                <div class="mb-3">
                  <h3 class="h5 mb-1">Template Status</h3>
                  <p class="text-muted mb-0">
                    Configure the availability status of this template.
                  </p>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Template Status</label>
                    <div class="form-check form-switch mt-2">
                      <input class="form-check-input" type="checkbox" formControlName="is_active" id="activeStatus">
                      <label class="form-check-label" for="activeStatus">
                        Active Template
                      </label>
                    </div>
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Active templates are available for creating new checklist instances.
                    </div>
                  </div>
                </div>
              </div>


              <!-- Checklist Items Section -->
              <div class="mb-4 pb-4 border-bottom">
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 class="h5 mb-1">
                        Checklist Items
                        <span *ngIf="selectedFormItemIndex !== null && focusedEditMode" class="badge bg-info ms-2">
                          Viewing Item {{getOutlineNumber(selectedFormItemIndex)}}
                        </span>
                        <span *ngIf="navViewMode === 'groups'" class="badge bg-warning text-dark ms-2">
                          Groups Only
                        </span>
                        <span *ngIf="navViewMode === 'items'" class="badge bg-primary ms-2">
                          Items Only
                        </span>
                      </h3>
                      <p class="text-muted mb-0">
                        Define inspection items and photo requirements for this template.
                      </p>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                      <button *ngIf="selectedFormItemIndex !== null || navViewMode !== 'all'" 
                              type="button" 
                              class="btn btn-outline-secondary btn-sm" 
                              (click)="showAllFormItems()">
                        <i class="mdi mdi-eye me-1"></i>Show All
                      </button>
                      <button type="button" class="btn btn-primary" (click)="addItem()">
                        <i class="mdi mdi-plus me-2"></i>
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Items List -->
                <div *ngIf="stickyParentIndex !== null" class="sticky-parent-banner">
                  <div class="d-flex align-items-center justify-content-between gap-2">
                    <div class="d-flex align-items-center gap-2 min-w-0">
                      <span class="badge bg-warning text-dark flex-shrink-0">Parent</span>
                      <span class="badge bg-secondary flex-shrink-0">{{ getOutlineNumber(stickyParentIndex!) }}</span>
                      <span class="text-truncate">
                        {{ getItemTitle(stickyParentIndex!) }}
                      </span>
                      <span class="text-muted flex-shrink-0" *ngIf="getChildCount(stickyParentIndex!) > 0">
                        ({{ getChildCount(stickyParentIndex!) }} child{{ getChildCount(stickyParentIndex!) !== 1 ? 'ren' : '' }})
                      </span>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary flex-shrink-0" (click)="scrollToItem(stickyParentIndex!)">
                      <i class="mdi mdi-arrow-up-bold me-1"></i>Jump to parent
                    </button>
                  </div>
                </div>
                <div formArrayName="items" cdkDropList (cdkDropListDropped)="dropItem($event)">
                  <div *ngFor="let item of items.controls; let i = index" 
                       [id]="'edit-item-' + i"
                       class="card mb-3" 
                       [formGroupName]="i" 
                       [ngStyle]="{'margin-left.rem': (item.get('level')?.value || 0) * 2}"
                       [class.border-start]="(item.get('level')?.value || 0) > 0"
                       [class.border-4]="(item.get('level')?.value || 0) > 0"
                       [class.border-primary]="(item.get('level')?.value || 0) > 0"
                       [style.display]="isFormItemVisible(i) ? 'block' : 'none'"
                       cdkDrag>
                    
                    <!-- Drag Preview (what you see while dragging) -->
                    <div class="card drag-preview" *cdkDragPreview>
                      <div class="card-header bg-light">
                        <i class="mdi mdi-drag-vertical me-2"></i>
                        <strong>{{getOutlineNumber(i)}}</strong> {{item.get('title')?.value || 'Untitled'}}
                      </div>
                    </div>
                    
                    <!-- Drag Handle and Header -->
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                      <div class="d-flex align-items-center">
                        <div class="drag-handle me-3" cdkDragHandle title="Drag to reorder">
                          <i class="mdi mdi-drag-vertical text-muted fs-4"></i>
                        </div>
                        <h6 class="mb-0">
                          <span class="badge bg-secondary me-2">{{getOutlineNumber(i)}}</span>
                          <span [class.text-primary]="(item.get('level')?.value || 0) > 0">
                            <i class="mdi" [class.mdi-file-document-outline]="(item.get('level')?.value || 0) === 0" [class.mdi-subdirectory-arrow-right]="(item.get('level')?.value || 0) > 0" class="me-1"></i>
                            {{item.get('title')?.value || 'Untitled'}}
                          </span>
                        </h6>
                      </div>
                      <div class="d-flex align-items-center gap-2">
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" formControlName="is_required" [id]="'required-' + i">
                          <label class="form-check-label" [for]="'required-' + i">
                            Active
                          </label>
                        </div>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-primary" 
                          (click)="addSubItem(i)"
                          title="Add nested item below this item">
                          <i class="mdi mdi-plus me-1"></i>Add Sub-item
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-info" 
                          (click)="demoteItem(i)"
                          *ngIf="i > 0 && canDemote(i)"
                          title="Nest under previous item">
                          <i class="mdi mdi-arrow-right-bold me-1"></i>Indent
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-secondary" 
                          (click)="promoteItem(i)"
                          *ngIf="(item.get('level')?.value || 0) > 0"
                          title="Move up one level">
                          <i class="mdi mdi-arrow-left-bold me-1"></i>Outdent
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-danger" 
                          (click)="removeItem(i)"
                          title="Remove item and all children">
                          <i class="mdi mdi-delete"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Item Content -->
                    <div class="card-body">
                      <div class="row mb-3">
                        <div class="col-md-12">
                          <label class="form-label">Title <span class="text-danger">*</span></label>
                               <input #itemTitleInput type="text" class="form-control" formControlName="title" placeholder="Enter item title"
                                 [ngClass]="{ 'is-invalid': item.get('title')?.invalid && item.get('title')?.touched }">
                          <div class="form-text">
                            <i class="mdi mdi-information-outline me-1"></i>
                            Clear title describing what needs to be inspected.
                          </div>
                          <div class="invalid-feedback" *ngIf="item.get('title')?.invalid && item.get('title')?.touched">
                            Title is required
                          </div>
                        </div>
                      </div>
                      
                      <!-- Hidden order field - auto-calculated, not editable -->
                      <input type="hidden" formControlName="order_index">

                      <div class="mb-3">
                        <label class="form-label">Description <span class="text-danger">*</span></label>
                        <div class="border rounded" [ngClass]="{ 'border-danger border-2': item.get('description')?.invalid && item.get('description')?.touched }">
                          <quill-editor 
                            formControlName="description" 
                            [modules]="quillConfig"
                            (onContentChanged)="onQuillContentChanged($event)"
                            placeholder="Enter item description (supports rich text formatting)"
                            class="quill-auto-height quill-item">
                          </quill-editor>
                        </div>
                        <div class="text-danger small mt-1" *ngIf="item.get('description')?.invalid && item.get('description')?.touched">
                          Description is required
                        </div>
                        <div class="form-text">
                          <i class="mdi mdi-information-outline me-1"></i>
                          Detailed instructions for this inspection item. Rich text formatting is supported.
                        </div>
                      </div>

                      <!-- Links Section (compact, open modal to edit) -->
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label mb-0">
                            <i class="mdi mdi-link-variant me-1"></i>Links
                          </label>
                          <button type="button" class="btn btn-outline-primary btn-sm" (click)="openLinksModal(i)">
                            <i class="mdi mdi-link-variant-plus me-1"></i>Manage Links
                            <span class="badge bg-primary ms-2">{{ getLinksFormArray(i).length }}</span>
                          </button>
                        </div>

                        <div *ngIf="getLinksFormArray(i).length === 0" class="text-muted small border rounded bg-light p-2">
                          No links added.
                        </div>

                        <div *ngIf="getLinksFormArray(i).length > 0" class="small text-muted">
                          <i class="mdi mdi-information-outline me-1"></i>
                          {{ getLinksFormArray(i).length }} link{{ getLinksFormArray(i).length !== 1 ? 's' : '' }} added.
                        </div>

                        <div *ngIf="getLinksFormArray(i).length > 0" class="mt-1 d-flex flex-column gap-1">
                          <a *ngFor="let link of getLinksFormArray(i).value"
                             class="small text-decoration-none text-primary text-truncate"
                             [href]="link.url"
                             target="_blank"
                             rel="noopener noreferrer"
                             [title]="link.title || link.url">
                            <i class="mdi mdi-link-variant me-1"></i>
                            {{ link.title || link.url }}
                          </a>
                        </div>
                      </div>

                      <!-- Submission Type Selector (Controls what sections appear) -->
                      <div class="mb-3">
                        <label class="form-label">
                          <i class="mdi mdi-checkbox-multiple-marked-circle text-info me-2"></i>
                          Submission Type
                        </label>
                        <select class="form-select" formControlName="submission_type">
                          <option value="photo">
                            📷 Photo Only - Users submit photos
                          </option>
                          <option value="video">
                            🎥 Video Only - Users submit videos
                          </option>
                          <option value="either">
                            📁 Photo OR Video - Users choose one (mutually exclusive)
                          </option>
                          <option value="none">
                            🚫 No Media Required - Instruction only
                          </option>
                        </select>
                        <div class="form-text">
                          <i class="mdi mdi-information-outline me-1"></i>
                          Determines what type of media users can submit for this item.
                        </div>
                      </div>

                        <!-- SAMPLE IMAGES SECTION (only for photo/either submissions) -->
                        <div *ngIf="(item.get('submission_type')?.value === 'photo' || item.get('submission_type')?.value === 'either')"
                          class="mb-3"
                          [ngClass]="{ 'border border-danger border-2 rounded p-2': (item.get('submission_type')?.value === 'photo' && item.get('photo_requirements')?.value?.picture_required && !hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0) || (item.get('submission_type')?.value === 'either' && !hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0 && !hasSampleVideo(i)) }">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label mb-0">
                            <i class="mdi mdi-image-multiple me-1"></i>Sample Images
                          </label>
                          <button type="button" class="btn btn-outline-primary btn-sm" (click)="openSampleImagesModal(i)">
                            <i class="mdi mdi-cog me-1"></i>Manage Images
                            <span class="badge bg-primary ms-2">{{getTotalSampleImagesCount(i)}}</span>
                          </button>
                        </div>
                        
                        <!-- Compact Display -->
                        <div *ngIf="hasPrimarySampleImage(i) || getReferenceImageCount(i) > 0" class="border rounded p-2 bg-light">
                          <div class="d-flex gap-2 flex-wrap">
                            <!-- Primary Image Thumbnail -->
                            <div *ngIf="hasPrimarySampleImage(i)" class="position-relative">
                              <img [src]="getPrimarySampleImageUrl(i)"
                                   class="img-thumbnail"
                                   style="width: 60px; height: 60px; object-fit: cover; cursor: pointer;"
                                   (click)="previewSampleImage(i)">
                              <span class="badge bg-primary position-absolute top-0 start-0" style="font-size: 0.6rem;">Primary</span>
                            </div>
                            <!-- Reference Images Thumbnails -->
                            <div *ngFor="let refImage of getReferenceImages(i); let refIdx = index" class="position-relative">
                              <img [src]="getReferenceImageUrl(refImage)"
                                   class="img-thumbnail"
                                   style="width: 60px; height: 60px; object-fit: cover; cursor: pointer;"
                                   (click)="previewReferenceImage(i, refIdx)">
                              <span class="badge bg-secondary position-absolute top-0 start-0" style="font-size: 0.6rem;">Ref</span>
                            </div>
                          </div>
                        </div>
                        
                        <div *ngIf="!hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0" class="text-muted text-center py-2 border rounded bg-white">
                          <i class="mdi mdi-image-off-outline"></i>
                          <small class="d-block">No sample images</small>
                        </div>
                        <div class="text-danger small mt-2" *ngIf="item.get('submission_type')?.value === 'photo' && item.get('photo_requirements')?.value?.picture_required && !hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0">
                          Sample photo required for Photo submission type.
                        </div>
                        <div class="text-danger small mt-2" *ngIf="item.get('submission_type')?.value === 'either' && !hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0 && !hasSampleVideo(i)">
                          Add a sample image or sample video.
                        </div>
                      </div>
                      
                      <!-- SAMPLE VIDEO SECTION (only for video/either submissions) -->
                        <div *ngIf="(item.get('submission_type')?.value === 'video' || item.get('submission_type')?.value === 'either')"
                          class="mb-3"
                          [ngClass]="{ 'border border-danger border-2 rounded p-2': (item.get('submission_type')?.value === 'video' && !hasSampleVideo(i)) || (item.get('submission_type')?.value === 'either' && !hasSampleVideo(i) && !hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0) }">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label mb-0">
                            <i class="mdi mdi-video me-1"></i>Sample Video
                          </label>
                          <button type="button" class="btn btn-outline-primary btn-sm" (click)="openSampleVideoModal(i)">
                            <i class="mdi mdi-cog me-1"></i>Manage Video
                          </button>
                        </div>
                        
                        <!-- Compact Display -->
                        <div *ngIf="hasSampleVideo(i)" class="border rounded p-2 bg-light text-center">
                          <video [src]="getPrimarySampleVideoUrl(i)" 
                                 style="max-height: 80px; max-width: 140px; object-fit: cover; cursor: pointer;"
                                 (click)="previewSampleVideo(i)"></video>
                          <div class="mt-1">
                            <small class="text-muted"><i class="mdi mdi-information-outline"></i> Click to preview</small>
                          </div>
                        </div>
                        
                        <div *ngIf="!hasSampleVideo(i)" class="text-muted text-center py-2 border rounded bg-white">
                          <i class="mdi mdi-video-off-outline"></i>
                          <small class="d-block">No sample video</small>
                        </div>
                        <div class="text-danger small mt-2" *ngIf="item.get('submission_type')?.value === 'video' && !hasSampleVideo(i)">
                          Sample video required for Video submission type.
                        </div>
                        <div class="text-danger small mt-2" *ngIf="item.get('submission_type')?.value === 'either' && !hasSampleVideo(i) && !hasPrimarySampleImage(i) && getReferenceImageCount(i) === 0">
                          Add a sample image or sample video.
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- No Items State -->
                <div *ngIf="items.length === 0" class="text-center p-5 border rounded bg-light">
                  <i class="mdi mdi-clipboard-list-outline text-muted mb-3" style="font-size: 3rem;"></i>
                  <h6 class="text-muted">No Checklist Items</h6>
                  <p class="text-muted mb-3">Add your first checklist item to get started</p>
                  <button type="button" class="btn btn-primary" (click)="addItem()">
                    <i class="mdi mdi-plus me-2"></i>
                    Add First Item
                  </button>
                </div>

              </div>

                  </div> <!-- end card-body -->

                </div>
              </div>
              
                  <div class="card-footer template-editor-footer bg-light border-top d-flex p-3">
                    <button type="button" class="btn btn-outline-secondary me-2" [disabled]="saving" (click)="cancel()">
                      <i class="mdi mdi-close me-1"></i>Cancel
                    </button>
                    <button type="button" class="btn btn-success ms-auto" [disabled]="saving" (click)="saveTemplate()">
                      @if (saving) {
                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      } @else {
                        <i class="mdi mdi-content-save me-1"></i>{{editingTemplate ? 'Save as New Version' : 'Create Template'}}
                      }
                    </button>
                  </div>
            </div>
            
            <!-- Navigation Sidebar Card -->
            <div class="col-12 col-md-4 col-lg-4 mt-3 mt-md-0" *ngIf="items.length > 0">
              <div class="position-sticky" style="top: 66px;">
                <div class="card shadow-sm border-0">
                  <div class="card-header bg-light">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <h6 class="mb-0">
                        <i class="mdi mdi-view-list me-2"></i>Navigation
                      </h6>
                      <div class="btn-group btn-group-sm" role="group">
                        <button type="button" 
                                class="btn btn-outline-secondary py-0 px-2" 
                                (click)="expandAllNav()"
                                title="Expand All">
                          <i class="mdi mdi-chevron-down"></i>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-secondary py-0 px-2" 
                                (click)="collapseAllNav()"
                                title="Collapse All">
                          <i class="mdi mdi-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                    
                    <div class="form-check form-switch">
                      <input class="form-check-input" 
                             type="checkbox" 
                             id="focusedEditModeSwitch" 
                             [(ngModel)]="focusedEditMode"
                             [ngModelOptions]="{standalone: true}">
                      <label class="form-check-label" for="focusedEditModeSwitch">
                        <small><i class="mdi mdi-filter me-1"></i>Focus Mode</small>
                      </label>
                    </div>

                    <div class="mt-2">
                      <div class="input-group input-group-sm">
                        <span class="input-group-text">
                          <i class="mdi mdi-magnify"></i>
                        </span>
                        <input 
                          type="text"
                          class="form-control"
                          placeholder="Search items..."
                          [(ngModel)]="navSearchTerm"
                          (input)="onNavSearchTermChanged()">
                        <button 
                          *ngIf="isNavSearchActive()"
                          type="button"
                          class="btn btn-outline-secondary"
                          (click)="clearNavSearch()"
                          title="Clear search">
                          <i class="mdi mdi-close"></i>
                        </button>
                      </div>
                      <div *ngIf="isNavSearchActive()" class="mt-1">
                        <small class="text-muted">
                          {{ navSearchMatchCount }} match{{ navSearchMatchCount !== 1 ? 'es' : '' }}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div class="card-body p-0">
                    <div class="list-group list-group-flush nav-scroll-container"
                         cdkDropList 
                         [cdkDropListDisabled]="isNavSearchActive()"
                         (cdkDropListDropped)="dropNavItem($event)">
                      <a *ngFor="let item of items.controls; let i = index" 
                         [id]="'nav-item-' + i"
                         class="list-group-item list-group-item-action py-2 border-0"
                         [class.bg-body-secondary]="activeNavItemIndex === i"
                         [class.border-start]="activeNavItemIndex === i"
                         [class.border-3]="activeNavItemIndex === i"
                         [class.border-primary]="activeNavItemIndex === i"
                         [class.fw-semibold]="activeNavItemIndex === i"
                         [class.nav-item-match]="isNavItemMatch(i)"
                         [class.nav-item-invalid]="isNavItemInvalid(i)"
                         style="cursor: pointer; min-height: 40px;"
                         [style.display]="isNavItemVisible(i) ? 'block' : 'none'"
                         [style.padding-left.rem]="0.5"
                         [style.padding-right.rem]="0.5"
                         cdkDrag
                         [cdkDragDisabled]="isNavSearchActive()"
                         (click)="scrollToItem(i)">
                        
                        <!-- Drag preview (what you see while dragging) -->
                        <div class="d-flex align-items-center gap-1 px-2 py-1 bg-body-secondary border rounded" *cdkDragPreview>
                          <i class="mdi" 
                             [class.mdi-folder]="(item.get('level')?.value || 0) === 0"
                             [class.mdi-file-document-outline]="(item.get('level')?.value || 0) > 0"
                             [class.text-warning]="(item.get('level')?.value || 0) === 0"
                             [class.text-muted]="(item.get('level')?.value || 0) > 0"></i>
                          <span class="badge bg-secondary" style="font-size: 0.65rem;">{{getOutlineNumber(i)}}</span>
                          <small class="fw-semibold">{{item.get('title')?.value || 'Untitled'}}</small>
                        </div>
                        
                        <div class="d-flex align-items-center gap-1">
                          <!-- Drag handle -->
                          <div class="flex-shrink-0" style="width: 16px;" cdkDragHandle title="Drag to reorder">
                            <i class="mdi mdi-drag-vertical text-muted" style="font-size: 18px; cursor: grab;"></i>
                          </div>
                          
                          <!-- Indentation spacer based on level -->
                          <div class="flex-shrink-0" [style.width.px]="(item.get('level')?.value || 0) * 20"></div>
                          
                          <!-- Expand/Collapse chevron for parent items -->
                          <div class="flex-shrink-0" style="width: 18px;">
                            <i *ngIf="hasChildren(i)" 
                               class="mdi text-muted"
                               [class.mdi-chevron-down]="expandedItems.has(i)"
                               [class.mdi-chevron-right]="!expandedItems.has(i)"
                               (click)="toggleNavExpansion(i, $event)"
                               style="cursor: pointer; font-size: 18px;"></i>
                          </div>
                          
                          <!-- Folder/File icon -->
                          <div class="flex-shrink-0" style="width: 20px;">
                            <i class="mdi" 
                               [class.mdi-folder-open]="(item.get('level')?.value || 0) === 0 && expandedItems.has(i)"
                               [class.mdi-folder]="(item.get('level')?.value || 0) === 0 && !expandedItems.has(i)"
                               [class.mdi-file-document-outline]="(item.get('level')?.value || 0) > 0"
                               [class.text-warning]="(item.get('level')?.value || 0) === 0"
                               [class.text-muted]="(item.get('level')?.value || 0) > 0"
                               style="font-size: 18px;"></i>
                          </div>
                          
                          <!-- Outline number badge -->
                          <span class="badge bg-secondary flex-shrink-0 me-1" style="min-width: 42px; font-size: 0.65rem;">
                            {{getOutlineNumber(i)}}
                          </span>
                          
                          <!-- Item title -->
                          <div class="flex-grow-1 min-w-0">
                            <small class="text-truncate d-block" 
                                   [class.fw-semibold]="(item.get('level')?.value || 0) === 0">
                              {{item.get('title')?.value || 'Untitled'}}
                            </small>
                          </div>
                          
                          <!-- Photo indicator badges -->
                          <div class="flex-shrink-0 d-flex align-items-center gap-1">
                            <!-- Has sample image -->
                            <div *ngIf="item.get('submission_type')?.value !== 'none' && hasPrimarySampleImage(i)" class="position-relative">
                              <img [src]="getPrimarySampleImageUrl(i)" 
                                   class="rounded border border-success"
                                   style="width: 28px; height: 28px; object-fit: cover;"
                                [alt]="'Thumbnail'"
                                title="Preview image"
                                (click)="previewNavPrimaryImage(i, $event)">
                              <i class="mdi mdi-check-circle position-absolute bg-white rounded-circle text-success" 
                                 style="bottom: -3px; right: -3px; font-size: 12px;"></i>
                            </div>
                            <!-- Requires photo but no image -->
                            <div *ngIf="item.get('submission_type')?.value !== 'none' && !hasPrimarySampleImage(i) && item.get('photo_requirements')?.value?.picture_required">
                              <div class="d-flex align-items-center justify-content-center rounded border border-warning bg-warning bg-opacity-10" 
                                   style="width: 28px; height: 28px;"
                                   title="Photo required">
                                <i class="mdi mdi-camera-outline text-warning" style="font-size: 14px;"></i>
                              </div>
                            </div>
                            <!-- Has video -->
                            <div *ngIf="item.get('submission_type')?.value !== 'none' && hasSampleVideo(i)" 
                                 class="d-flex align-items-center justify-content-center rounded border border-info bg-info bg-opacity-10" 
                                 style="width: 28px; height: 28px;object-fit: cover;"
                                 title="Preview video"
                                 (click)="previewNavSampleVideo(i, $event)">
                              <i class="mdi mdi-video text-info" style="font-size: 14px;"></i>
                            </div>
                          </div>
                          
                          <!-- Invalid indicator -->
                          <div class="flex-shrink-0" *ngIf="isNavItemInvalid(i)" title="Item has missing/invalid fields">
                            <i class="mdi mdi-alert-circle text-danger" style="font-size: 16px;"></i>
                          </div>

                          <!-- 3-dot dropdown menu -->
                          <div class="flex-shrink-0 nav-item-actions" ngbDropdown container="body" placement="bottom-end">
                            <button class="btn btn-sm btn-link text-muted p-0 border-0" 
                                    ngbDropdownToggle
                                    (click)="$event.stopPropagation()"
                                    style="width: 24px; height: 24px; line-height: 1;"
                                    title="Actions">
                              <i class="mdi mdi-dots-vertical" style="font-size: 18px;"></i>
                            </button>
                            <div ngbDropdownMenu>
                              <button ngbDropdownItem (click)="editItemOnly(i, $event)">
                                <i class="mdi mdi-pencil me-2"></i>Edit Item
                              </button>
                              <div class="dropdown-divider"></div>
                              <button ngbDropdownItem (click)="addItemAbove(i, $event)">
                                <i class="mdi mdi-arrow-up-bold me-2"></i>Add Item Above
                              </button>
                              <button ngbDropdownItem (click)="addItemBelow(i, $event)">
                                <i class="mdi mdi-arrow-down-bold me-2"></i>Add Item Below
                              </button>
                              <button ngbDropdownItem (click)="duplicateItem(i, $event)">
                                <i class="mdi mdi-content-copy me-2"></i>Duplicate
                              </button>
                              <div class="dropdown-divider"></div>
                              <button ngbDropdownItem (click)="moveItemUp(i, $event)" [disabled]="i === 0">
                                <i class="mdi mdi-chevron-up me-2"></i>Move Up
                              </button>
                              <button ngbDropdownItem (click)="moveItemDown(i, $event)" [disabled]="i === items.length - 1">
                                <i class="mdi mdi-chevron-down me-2"></i>Move Down
                              </button>
                              <div class="dropdown-divider"></div>
                              <button ngbDropdownItem (click)="promoteItem(i)" [disabled]="(item.get('level')?.value || 0) === 0">
                                <i class="mdi mdi-arrow-left-bold me-2"></i>Promote (Outdent)
                              </button>
                              <button ngbDropdownItem (click)="demoteItem(i)" [disabled]="i === 0">
                                <i class="mdi mdi-arrow-right-bold me-2"></i>Demote (Indent)
                              </button>
                              <div class="dropdown-divider"></div>
                              <button ngbDropdownItem (click)="deleteItemFromNav(i, $event)" class="text-danger">
                                <i class="mdi mdi-delete me-2"></i>Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                  <div class="card-footer bg-light text-center py-2">
                    <small class="text-muted">
                      <i class="mdi mdi-information-outline me-1"></i>
                      {{ items.length }} item{{ items.length !== 1 ? 's' : '' }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
    </div>

    <!-- Import Modal -->
    <ng-template #importModal let-modal>
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">
          <i class="mdi mdi-file-import me-2"></i>
          Import Checklist Template
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info">
          <i class="mdi mdi-information me-2"></i>
          <strong>Import Options:</strong>
          <ul class="mb-0 mt-2">
            <li><strong>Word Document (.docx)</strong> - <span class="badge bg-success">Recommended</span> - Best extraction quality with reliable text and image parsing</li>
            <li>PDF (.pdf) - May require manual review due to extraction limitations</li>
            <li>CSV (.csv) - Simple text-based import</li>
            <li>Manual creation - Specify number of items to create</li>
          </ul>
        </div>

        <!-- File Upload Section -->
        <div class="mb-4">
          <label class="form-label">Upload File</label>
          <input 
            type="file" 
            class="form-control" 
            accept=".docx,.doc,.pdf,.csv"
            (change)="onImportFileSelected($event)"
            #fileInput>
          <div class="form-text">
            <i class="mdi mdi-lightbulb-on-outline me-1 text-success"></i>
            <strong>Tip:</strong> Word documents (.docx) provide the best import results with proper structure, formatting, and images.
          </div>
        </div>

        <div class="text-center my-3">
          <small class="text-muted">— OR —</small>
        </div>

        <!-- Manual Entry Section -->
        <div class="mb-3">
          <label class="form-label">Create Template Manually</label>
          <div class="row">
            <div class="col-md-8 mb-2">
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="importManualName"
                placeholder="Template name">
            </div>
            <div class="col-md-4 mb-2">
              <input 
                type="number" 
                class="form-control" 
                [(ngModel)]="importManualItemCount"
                min="1"
                max="50"
                placeholder="# of items">
            </div>
          </div>
          <div class="form-text">
            <i class="mdi mdi-information-outline me-1"></i>
            Specify template name and number of checklist items to create
          </div>
        </div>

        <div *ngIf="importing" class="text-center py-3">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted">Processing import...</p>
        </div>

        <div *ngIf="importError" class="alert alert-danger">
          <i class="mdi mdi-alert me-2"></i>
          {{ importError }}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()" [disabled]="importing">
          Cancel
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          (click)="processManualImport(); modal.close()"
          [disabled]="!importManualName || !importManualItemCount || importing">
          <i class="mdi mdi-plus me-1"></i>
          Create Manual Template
        </button>
      </div>
    </ng-template>

    <!-- Image Preview Modal -->
    <ng-template #imagePreviewModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Sample Image Preview</h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body text-center">
        <img [src]="previewImageUrl" 
             class="img-fluid" 
             style="max-height: 70vh; max-width: 100%; object-fit: contain;"
             alt="Sample image preview">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Close</button>
      </div>
    </ng-template>

    <!-- Video Preview Modal -->
    <ng-template #videoPreviewModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Sample Video Preview</h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body text-center">
        <video *ngIf="previewVideoUrl" [src]="previewVideoUrl" controls class="w-100" style="max-height:70vh; object-fit:contain;"></video>
        <div *ngIf="!previewVideoUrl" class="text-muted">No video to preview</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Close</button>
      </div>
    </ng-template>

    <!-- Sample Images Management Modal -->
    <ng-template #sampleImagesModalTemplate let-modal>
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">
          <i class="mdi mdi-image-multiple me-2"></i>
          Manage Sample Images
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p class="text-muted mb-4">
          <i class="mdi mdi-information-outline me-1"></i>
          Configure the primary sample image and reference images for this checklist item.
        </p>

        <!-- Primary Sample Image -->
        <div class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <label class="form-label mb-0 fw-bold">Primary Sample Image</label>
              <small class="d-block text-muted">The main image users should replicate when taking photos</small>
            </div>
            <button type="button" class="btn btn-outline-primary btn-sm" 
                    (click)="openPrimarySampleImageUpload(currentModalItemIndex)"
                    [disabled]="uploadingImage">
              <span *ngIf="uploadingImage" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <i *ngIf="!uploadingImage" class="mdi" [class.mdi-plus]="!hasPrimarySampleImage(currentModalItemIndex)" [class.mdi-image-edit]="hasPrimarySampleImage(currentModalItemIndex)"></i>
              {{uploadingImage ? 'Uploading...' : (hasPrimarySampleImage(currentModalItemIndex) ? 'Replace' : 'Add Sample')}}
            </button>
          </div>
          
          <div *ngIf="hasPrimarySampleImage(currentModalItemIndex)" class="d-flex align-items-center border rounded p-3 bg-light">
            <div class="position-relative me-3">
              <img [src]="getPrimarySampleImageUrl(currentModalItemIndex)"
                   class="img-thumbnail border-primary"
                   style="width: 150px; height: 150px; object-fit: contain; cursor: pointer; background: white; border-width: 3px !important;"
                   [alt]="getPrimarySampleImage(currentModalItemIndex)?.label || 'Primary sample image'"
                   (click)="previewSampleImage(currentModalItemIndex)"
                   (error)="onSampleImageError(currentModalItemIndex)"
                   (load)="onSampleImageLoad(currentModalItemIndex)">
              <span class="badge bg-primary position-absolute bottom-0 start-50 translate-middle-x mb-1">
                Primary
              </span>
              <button type="button"
                      class="btn btn-danger position-absolute top-0 end-0"
                      style="transform: translate(50%, -50%); width: 24px; height: 24px; padding: 0; border-radius: 50%;"
                      (click)="removePrimarySampleImage(currentModalItemIndex)">
                <i class="mdi mdi-close" style="font-size: 0.8rem;"></i>
              </button>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-start mb-2">
                <i class="mdi mdi-target text-primary me-2 mt-1"></i>
                <div>
                  <strong>Match This Photo</strong>
                  <p class="mb-0 text-muted small">Users will compare their captured photo against this image</p>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="!hasPrimarySampleImage(currentModalItemIndex)" class="text-muted text-center py-4 border-2 border-dashed rounded bg-white" style="border: 2px dashed #dee2e6;">
            <i class="mdi mdi-camera-outline text-primary mb-2" style="font-size: 2.5rem;"></i>
            <p class="mb-0"><strong>No primary sample image</strong></p>
            <p class="mb-0 small text-muted">Add the main reference photo users should replicate</p>
          </div>
        </div>

        <hr>

        <!-- Reference Images -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <label class="form-label mb-0 fw-bold">Reference Images</label>
              <small class="d-block text-muted">Additional context images (max 5) - different angles, examples, diagrams</small>
            </div>
            <button type="button" class="btn btn-outline-secondary btn-sm" 
                    (click)="openReferenceImageUpload(currentModalItemIndex)"
                    [disabled]="uploadingImage || getReferenceImageCount(currentModalItemIndex) >= 5">
              <span *ngIf="uploadingImage" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <i *ngIf="!uploadingImage" class="mdi mdi-plus"></i>
              {{uploadingImage ? 'Uploading...' : 'Add Reference'}}
              <span class="badge bg-secondary ms-1">{{getReferenceImageCount(currentModalItemIndex)}}/5</span>
            </button>
          </div>
          
          <!-- Reference Images Grid -->
          <div *ngIf="getReferenceImages(currentModalItemIndex).length > 0" class="row g-2">
            <div class="col-6 col-md-4" *ngFor="let refImage of getReferenceImages(currentModalItemIndex); let refIdx = index">
              <div class="position-relative border rounded p-2 bg-white">
                <img [src]="refImage.url"
                     class="img-thumbnail w-100"
                     style="height: 100px; object-fit: cover; cursor: pointer;"
                     [alt]="refImage.label || 'Reference image'"
                     (click)="previewReferenceImage(currentModalItemIndex, refIdx)">
                <button type="button"
                        class="btn btn-danger btn-sm position-absolute top-0 end-0"
                        style="transform: translate(25%, -25%); width: 20px; height: 20px; padding: 0; border-radius: 50%;"
                        (click)="removeReferenceImage(currentModalItemIndex, refIdx)">
                  <i class="mdi mdi-close" style="font-size: 0.7rem;"></i>
                </button>
                <div class="mt-1">
                  <input type="text" 
                         class="form-control form-control-sm" 
                         placeholder="Label (optional)"
                         [(ngModel)]="refImage.label"
                         [ngModelOptions]="{standalone: true}">
                  <select class="form-select form-select-sm mt-1" 
                          [(ngModel)]="refImage.image_type"
                          [ngModelOptions]="{standalone: true}">
                    <option value="reference">Reference</option>
                    <option value="defect_example">Defect Example</option>
                    <option value="diagram">Diagram</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="getReferenceImages(currentModalItemIndex).length === 0" class="text-muted text-center py-3 border rounded bg-light">
            <i class="mdi mdi-image-multiple-outline mb-2" style="font-size: 1.5rem;"></i>
            <p class="mb-0 small">No reference images added</p>
          </div>
        </div>

        <hr>

        <!-- Photo Requirements -->
        <div class="mb-3" *ngIf="currentModalItemIndex >= 0 && getItemFormGroup(currentModalItemIndex)">
          <h6 class="mb-3 fw-bold">
            <i class="mdi mdi-cog me-1"></i>Photo Requirements
          </h6>
          
          <div [formGroup]="getItemFormGroup(currentModalItemIndex)!">
            <div formGroupName="photo_requirements">
            <!-- Photo Capture Guidelines -->
            <div class="row mb-3 p-3 bg-light rounded">
              <div class="col-md-6 mb-3">
                <label class="form-label">Viewing Angle</label>
                <select class="form-select form-select-sm" formControlName="angle">
                  <option value="">Any Angle</option>
                  <option value="front">Front View</option>
                  <option value="back">Back View</option>
                  <option value="side">Side View</option>
                  <option value="top">Top View</option>
                  <option value="bottom">Bottom View</option>
                  <option value="diagonal">Diagonal View</option>
                </select>
                <small class="form-text text-muted">Required viewing angle</small>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Capture Distance</label>
                <select class="form-select form-select-sm" formControlName="distance">
                  <option value="">Any Distance</option>
                  <option value="close">Close-up</option>
                  <option value="medium">Medium</option>
                  <option value="far">Wide View</option>
                </select>
                <small class="form-text text-muted">Required distance</small>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Lighting</label>
                <select class="form-select form-select-sm" formControlName="lighting">
                  <option value="">Any Lighting</option>
                  <option value="bright">Bright</option>
                  <option value="normal">Normal</option>
                  <option value="dim">Dim</option>
                </select>
                <small class="form-text text-muted">Lighting conditions</small>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Focus Area</label>
                <input type="text" class="form-control form-control-sm" formControlName="focus" placeholder="e.g., connector pins">
                <small class="form-text text-muted">Specific focus area</small>
              </div>
            </div>

            <!-- Photo Count Requirements -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Minimum Photos</label>
                <input type="number" class="form-control form-control-sm" formControlName="min_photos" min="0" max="10" placeholder="0">
                <small class="form-text text-muted">Minimum required (0 = optional)</small>
              </div>
              <div class="col-md-6">
                <label class="form-label">Maximum Photos</label>
                <input type="number" class="form-control form-control-sm" formControlName="max_photos" min="1" max="10" placeholder="10">
                <small class="form-text text-muted">Maximum allowed per item</small>
              </div>
            </div>

            <!-- Photo Required Toggle -->
            <div class="p-3 bg-light rounded">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" formControlName="picture_required" [id]="'modal-picture-required-' + currentModalItemIndex">
                <label class="form-check-label" [for]="'modal-picture-required-' + currentModalItemIndex">
                  <strong>Picture Required</strong>
                </label>
              </div>
              <small class="form-text text-muted d-block mt-2">
                <i class="mdi mdi-lightbulb-on-outline"></i>
                When <strong>ON</strong>: Users must take a photo. When <strong>OFF</strong>: Users can confirm without capturing.
              </small>
            </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" (click)="modal.close()">
          <i class="mdi mdi-check me-1"></i>Done
        </button>
      </div>
    </ng-template>

    <!-- Sample Video Management Modal -->
    <ng-template #sampleVideoModalTemplate let-modal>
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">
          <i class="mdi mdi-video me-2"></i>
          Manage Sample Video
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p class="text-muted mb-4">
          <i class="mdi mdi-information-outline me-1"></i>
          Optional short video demonstrating the required capture (mp4/webm)
        </p>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <label class="form-label mb-0 fw-bold">Sample Video</label>
          <div>
            <button type="button" class="btn btn-outline-primary btn-sm me-2" (click)="openSampleVideoUpload(currentModalItemIndex)" [disabled]="uploadingVideo">
              <span *ngIf="uploadingVideo" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!uploadingVideo" class="mdi mdi-video-plus"></i>
              {{ uploadingVideo ? 'Uploading...' : (hasSampleVideo(currentModalItemIndex) ? 'Replace Video' : 'Add Video') }}
            </button>
            <button *ngIf="hasSampleVideo(currentModalItemIndex)" type="button" class="btn btn-outline-secondary btn-sm" (click)="previewSampleVideo(currentModalItemIndex)">
              <i class="mdi mdi-play-circle me-1"></i>Preview
            </button>
            <button *ngIf="hasSampleVideo(currentModalItemIndex)" type="button" class="btn btn-danger btn-sm ms-2" (click)="removeSampleVideo(currentModalItemIndex)">
              <i class="mdi mdi-delete"></i>
            </button>
          </div>
        </div>

        <div *ngIf="hasSampleVideo(currentModalItemIndex)" class="border rounded p-3 bg-light text-center">
          <video [src]="getPrimarySampleVideoUrl(currentModalItemIndex)" controls style="max-height:300px; max-width:100%; object-fit:contain;"></video>
        </div>
        
        <div *ngIf="!hasSampleVideo(currentModalItemIndex)" class="text-muted text-center py-5 border-2 border-dashed rounded bg-white" style="border: 2px dashed #dee2e6;">
          <i class="mdi mdi-video-outline text-primary mb-2" style="font-size: 3rem;"></i>
          <p class="mb-0"><strong>No sample video</strong></p>
          <p class="mb-0 small text-muted">Add a short video demonstration</p>
        </div>

        <hr>

        <!-- Video Requirements -->
        <div class="mb-3" *ngIf="currentModalItemIndex >= 0 && getItemFormGroup(currentModalItemIndex)">
          <h6 class="mb-3 fw-bold">
            <i class="mdi mdi-cog me-1"></i>Video Requirements
          </h6>
          
          <div [formGroup]="getItemFormGroup(currentModalItemIndex)!">
            <div class="row">
              <div class="col-md-6" formGroupName="photo_requirements">
                <label class="form-label">Max Video Duration</label>
                <input type="number" class="form-control form-control-sm" formControlName="max_video_duration_seconds" min="1" max="600">
                <small class="form-text text-muted">Maximum video length in seconds</small>
              </div>
              <div class="col-md-6">
                <label class="form-label">Submission Time Limit</label>
                <input type="number" class="form-control form-control-sm" formControlName="submission_time_seconds" min="0" placeholder="0 for no limit">
                <small class="form-text text-muted">Time allowed to submit (seconds)</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" (click)="modal.close()">
          <i class="mdi mdi-check me-1"></i>Done
        </button>
      </div>
    </ng-template>

    <!-- Links Management Modal -->
    <ng-template #linksModalTemplate let-modal>
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">
          <i class="mdi mdi-link-variant me-2"></i>
          Manage Links
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body" *ngIf="currentLinksItemIndex >= 0 && getItemFormGroup(currentLinksItemIndex)">
        <p class="text-muted mb-3">
          <i class="mdi mdi-information-outline me-1"></i>
          Add reference links for this checklist item (specs, drawings, videos, etc.).
        </p>

        <div [formGroup]="getItemFormGroup(currentLinksItemIndex)!">
          <div formArrayName="links">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0">
                Links
              </label>
              <button type="button" class="btn btn-outline-primary btn-sm" (click)="addLink(currentLinksItemIndex)">
                <i class="mdi mdi-plus me-1"></i>Add Link
              </button>
            </div>

            <div *ngIf="getLinksFormArray(currentLinksItemIndex).length === 0" class="text-muted small border rounded bg-light p-2">
              No links added.
            </div>

            <div class="d-flex flex-column gap-2" *ngIf="getLinksFormArray(currentLinksItemIndex).length > 0">
              <div *ngFor="let link of getLinksFormArray(currentLinksItemIndex).controls; let linkIndex = index" [formGroupName]="linkIndex" class="border rounded p-2">
                <div class="row g-2 align-items-end">
                  <div class="col-md-4">
                    <label class="form-label mb-1">Title <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" formControlName="title" placeholder="Link title"
                           [ngClass]="{ 'is-invalid': link.get('title')?.invalid && link.get('title')?.touched }">
                    <div class="invalid-feedback" *ngIf="link.get('title')?.invalid && link.get('title')?.touched">
                      Title is required
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label mb-1">URL <span class="text-danger">*</span></label>
                    <input type="url" class="form-control" formControlName="url" placeholder="https://example.com"
                           [ngClass]="{ 'is-invalid': link.get('url')?.invalid && link.get('url')?.touched }">
                    <div class="invalid-feedback" *ngIf="link.get('url')?.invalid && link.get('url')?.touched">
                      URL is required
                    </div>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label mb-1">Description</label>
                    <input type="text" class="form-control" formControlName="description" placeholder="Optional description">
                  </div>
                  <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger btn-sm w-100" (click)="removeLink(currentLinksItemIndex, linkIndex)" title="Remove link">
                      <i class="mdi mdi-delete"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" (click)="modal.close()">
          <i class="mdi mdi-check me-1"></i>Done
        </button>
      </div>
    </ng-template>

    <!-- Preview Modal -->
    <ng-template #previewModal let-modal>
      <div class="modal-header bg-light">
        <h5 class="modal-title">
          <i class="mdi mdi-eye me-2"></i>Checklist Preview
          <span class="badge bg-info ms-2">{{templateForm.get('name')?.value || 'Untitled Template'}}</span>
        </h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body p-0" style="max-height: 70vh; overflow: hidden;">
        <div class="row g-0 h-100">
          <!-- Main Content Area -->
          <div class="col-md-9 pe-3" style="max-height: 70vh; overflow-y: auto; padding: 1rem;" #previewContent>
            <!-- Template Info Banner -->
            <div class="alert alert-info mb-4">
              <div class="row">
                <div class="col-md-6">
                  <strong>Category:</strong> {{templateForm.get('category')?.value | titlecase}}<br>
                  <strong>Part Number:</strong> {{templateForm.get('part_number')?.value || 'N/A'}}
                </div>
                <div class="col-md-6">
                  <strong>Product Type:</strong> {{templateForm.get('product_type')?.value || 'N/A'}}<br>
                  <strong>Total Items:</strong> {{items.length}}
                </div>
              </div>
              
              <!-- Quick Stats -->
              <div class="border-top mt-3 pt-3">
                <div class="row small">
                  <div class="col-6 col-md-3">
                    <i class="mdi mdi-checkbox-marked-circle text-danger me-1"></i>
                    <strong>{{getRequiredItemsCount()}}</strong> Required
                  </div>
                  <div class="col-6 col-md-3">
                    <i class="mdi mdi-camera text-primary me-1"></i>
                    <strong>{{getPhotoItemsCount()}}</strong> Photo
                  </div>
                  <div class="col-6 col-md-3">
                    <i class="mdi mdi-video text-success me-1"></i>
                    <strong>{{getVideoItemsCount()}}</strong> Video
                  </div>
                  <div class="col-6 col-md-3">
                    <i class="mdi mdi-image-multiple text-info me-1"></i>
                    <strong>{{getItemsWithMediaCount()}}</strong> With Media
                  </div>
                </div>
              </div>
            </div>

            <!-- Checklist Items Preview -->
            <div *ngFor="let item of items.controls; let i = index" class="mb-3" [id]="'preview-item-' + i">
              <div class="card border" 
               [class.border-primary]="item.get('level')?.value === 0"
               [class.border-secondary]="item.get('level')?.value > 0"
               [style.margin-left.rem]="(item.get('level')?.value || 0) * 1.5">
            <div class="card-body p-3">
              <!-- Item Header -->
              <div class="d-flex align-items-start mb-2">
                <span class="badge bg-secondary me-2" style="min-width: 50px; font-size: 0.9rem;">
                  {{getOutlineNumber(i)}}
                </span>
                <div class="flex-grow-1">
                  <h6 class="mb-1" [class.fw-bold]="item.get('level')?.value === 0">
                    {{item.get('title')?.value}}
                    <span *ngIf="item.get('is_required')?.value" class="badge bg-danger ms-2">Active</span>
                  </h6>
                  
                  <!-- Description (plain text, no rich editor) -->
                  <div *ngIf="item.get('description')?.value" 
                       class="text-muted small mb-2"
                       [innerHTML]="item.get('description')?.value">
                  </div>

                  <!-- Links Preview -->
                  <div *ngIf="getLinksFormArray(i).length > 0" class="mb-2">
                    <small class="text-muted d-block mb-1">
                      <i class="mdi mdi-link-variant me-1"></i>Links
                    </small>
                    <div class="list-group list-group-flush">
                      <a *ngFor="let link of getLinksFormArray(i).value"
                         class="list-group-item list-group-item-action px-0 py-1"
                         [href]="link.url"
                         target="_blank"
                         rel="noopener noreferrer">
                        <div class="fw-semibold text-truncate">{{ link.title || link.url }}</div>
                        <div class="small text-muted" *ngIf="link.description">{{ link.description }}</div>
                      </a>
                    </div>
                  </div>

                  <!-- Submission Type Badge -->
                  <div class="mb-2">
                    <span class="badge" [ngSwitch]="item.get('submission_type')?.value">
                      <span *ngSwitchCase="'photo'" class="badge bg-primary">
                        <i class="mdi mdi-camera me-1"></i>Photo
                      </span>
                      <span *ngSwitchCase="'video'" class="badge bg-success">
                        <i class="mdi mdi-video me-1"></i>Video
                      </span>
                      <span *ngSwitchCase="'either'" class="badge bg-info">
                        <i class="mdi mdi-file-multiple me-1"></i>Photo/Video
                      </span>
                      <span *ngSwitchCase="'none'" class="badge bg-secondary">
                        <i class="mdi mdi-cancel me-1"></i>No Media
                      </span>
                    </span>
                  </div>

                  <!-- Sample Images Preview (improved layout) -->
                  <div *ngIf="(item.get('submission_type')?.value === 'photo' || item.get('submission_type')?.value === 'either') && getSampleImagesArray(i).length > 0">
                    <!-- Primary Sample Image - Large, floated right -->
                    <div *ngFor="let img of getSampleImagesArray(i)">
                      <div *ngIf="img.is_primary" class="float-end ms-3 mb-2">
                        <div class="text-center">
                          <img [src]="img.url" 
                               class="rounded border border-primary shadow-sm" 
                               style="width: 200px; height: 200px; object-fit: cover; cursor: pointer;"
                               [title]="img.label || 'Primary Sample Image'"
                               (click)="openImagePreview(img.url)">
                          <div class="small text-muted mt-1">
                            <i class="mdi mdi-star text-warning me-1"></i>Primary Sample
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Reference Images - Small thumbnails -->
                    <div class="mb-2">
                      <small class="text-muted d-block mb-2">
                        <i class="mdi mdi-image-multiple me-1"></i>Reference Images:
                      </small>
                      <div class="d-flex flex-wrap gap-2">
                        <div *ngFor="let img of getSampleImagesArray(i)" class="text-center">
                          <img *ngIf="!img.is_primary"
                               [src]="img.url" 
                               class="rounded border" 
                               style="width: 60px; height: 60px; object-fit: cover; cursor: pointer;"
                               [title]="img.label || 'Reference Image'"
                               (click)="openImagePreview(img.url)">
                          <div *ngIf="!img.is_primary" class="small text-muted" style="font-size: 0.7rem; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {{img.label || 'Reference'}}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="clearfix"></div>
                    
                    <!-- Photo Requirements -->
                    <div class="small text-muted mt-2">
                      <i class="mdi mdi-cog me-1"></i>
                      Min: {{item.get('photo_requirements.min_photos')?.value || 1}}, 
                      Max: {{item.get('photo_requirements.max_photos')?.value || 5}}
                      <span *ngIf="item.get('photo_requirements.angle')?.value">
                        | Angle: {{item.get('photo_requirements.angle')?.value}}
                      </span>
                      <span *ngIf="item.get('photo_requirements.distance')?.value">
                        | Distance: {{item.get('photo_requirements.distance')?.value}}
                      </span>
                    </div>
                  </div>

                  <!-- Sample Videos Preview -->
                  <div *ngIf="(item.get('submission_type')?.value === 'video' || item.get('submission_type')?.value === 'either') && getSampleVideosArray(i).length > 0">
                    <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
                      <small class="text-muted me-2">
                        <i class="mdi mdi-video me-1"></i>Sample Videos:
                      </small>
                      <video *ngFor="let vid of getSampleVideosArray(i)" 
                             [src]="vid.url" 
                             class="rounded border" 
                             style="width: 80px; height: 50px; object-fit: cover;">
                      </video>
                    </div>
                    
                    <!-- Video Requirements -->
                    <div class="small text-muted" *ngIf="item.get('photo_requirements.max_video_duration_seconds')?.value">
                      <i class="mdi mdi-clock-outline me-1"></i>
                      Max Duration: {{item.get('photo_requirements.max_video_duration_seconds')?.value}}s
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

            <!-- Empty State -->
            <div *ngIf="items.length === 0" class="text-center text-muted py-5">
              <i class="mdi mdi-clipboard-text-outline" style="font-size: 4rem;"></i>
              <p class="mt-3">No items to preview</p>
            </div>
          </div>

          <!-- Navigation Sidebar -->
          <div class="col-md-3 border-start bg-light" style="max-height: 70vh; overflow-y: auto;">
            <div class="p-3">
              <h6 class="text-muted mb-3">
                <i class="mdi mdi-map-marker-path me-1"></i>Navigation
              </h6>

              <!-- Navigation Items -->
              <div class="nav flex-column">
                <a *ngFor="let item of items.controls; let i = index"
                   class="nav-link py-2 px-2 text-start border-bottom"
                   [class.fw-bold]="item.get('level')?.value === 0"
                   [class.text-primary]="item.get('level')?.value === 0"
                   [class.text-secondary]="item.get('level')?.value > 0"
                   [style.padding-left.rem]="0.5 + (item.get('level')?.value || 0) * 0.75"
                   [style.font-size.rem]="item.get('level')?.value === 0 ? 0.9 : 0.85"
                   (click)="scrollToPreviewItem(i)"
                   style="cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='rgba(13, 110, 253, 0.1)'"
                   onmouseout="this.style.backgroundColor='transparent'">
                  <span class="badge bg-secondary me-2" style="font-size: 0.7rem; min-width: 40px;">
                    {{getOutlineNumber(i)}}
                  </span>
                  <span class="text-truncate d-inline-block" style="max-width: 150px;" [title]="item.get('title')?.value">
                    {{item.get('title')?.value}}
                  </span>
                  <span *ngIf="item.get('is_required')?.value" class="badge bg-danger ms-1" style="font-size: 0.6rem;">
                    Active
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">
          <i class="mdi mdi-close me-1"></i>Close
        </button>
        <button type="button" class="btn btn-primary" (click)="modal.dismiss(); saveTemplate()">
          <i class="mdi mdi-content-save me-1"></i>Save Template
        </button>
      </div>
    </ng-template>

    <!-- Sample Image Upload Modal (keeping existing modal for now) -->
    <!-- Add your existing modal templates here -->

      </div>

    <!-- Print-Only Professional PDF Layout -->
    <div class="print-only">
      <div class="print-header d-flex justify-content-between align-items-end">
        <div>
          <div class="title">Checklist Template</div>
          <div class="print-muted">{{ templateForm.get('name')?.value || 'Untitled Template' }}</div>
        </div>
        <div class="text-end print-meta">
          <div>Version: {{ editingTemplate?.version || 'New' }}</div>
          <div>Date: {{ today | date:'mediumDate' }}</div>
        </div>
      </div>

      <div class="print-section-title">Template Details</div>
      <div class="row g-2 print-meta">
        <div class="col-6">Category: {{ templateForm.get('category')?.value | titlecase }}</div>
        <div class="col-6">Product Type: {{ templateForm.get('product_type')?.value || 'N/A' }}</div>
        <div class="col-6">Part Number: {{ templateForm.get('part_number')?.value || 'N/A' }}</div>
        <div class="col-6" *ngIf="editingTemplate?.quality_document_metadata">
          Doc: {{ editingTemplate?.quality_document_metadata?.document_number }} Rev {{ editingTemplate?.quality_document_metadata?.revision_number }}
        </div>
      </div>

      <div class="print-section-title">Template Items</div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 18%">Item</th>
            <th>Description</th>
            <th style="width: 10%">Type</th>
            <th style="width: 10%">Required</th>
            <th style="width: 20%">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of items.controls; let i = index">
            <td>
              <div><strong>{{ getOutlineNumber(i) }}.</strong></div>
              <div>{{ item.get('title')?.value || 'Untitled' }}</div>
            </td>
            <td [innerHTML]="item.get('description')?.value"></td>
            <td>{{ item.get('submission_type')?.value | titlecase }}</td>
            <td>{{ item.get('is_required')?.value ? 'Yes' : 'No' }}</td>
            <td>
              <div class="print-field-line"></div>
              <div class="print-field-line"></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    </div>
  `,
  styles: [`
    .print-only {
      display: none;
    }

    .print-header {
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    .print-header .title {
      font-size: 20px;
      font-weight: 700;
      color: #1e3a8a;
    }

    .print-meta {
      font-size: 12px;
      color: #4b5563;
    }

    .print-section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1f2937;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 4px;
      margin: 14px 0 8px;
    }

    .print-field-line {
      border-bottom: 1px solid #9ca3af;
      height: 18px;
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .print-table th,
    .print-table td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      vertical-align: top;
    }

    .print-table th {
      background: #f3f4f6;
      font-weight: 700;
    }

    .print-checkbox {
      width: 12px;
      height: 12px;
      border: 1px solid #6b7280;
      display: inline-block;
      margin-right: 6px;
    }

    .print-muted {
      color: #6b7280;
      font-size: 11px;
    }

    @media print {
      .print-hide {
        display: none !important;
      }

      .print-only {
        display: block !important;
      }

      @page {
        margin: 0.5in;
      }
    }

    /* Sticky Footer for Template Editor */
    .template-editor-card {
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 180px);
    }
    
    .template-editor-body {
      overflow-y: auto;
      flex: 1;
      padding-bottom: 20px;
    }
    
    .template-editor-footer {
      position: sticky !important;
      bottom: 0;
      z-index: 1040;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }
    
    .drag-handle {
      cursor: move;
      cursor: grab;
      transition: all 0.2s;
    }
    
    .drag-handle:active {
      cursor: grabbing;
    }
    
    .drag-handle:hover {
      transform: scale(1.1);
    }
    
    .drag-preview {
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      border: 2px solid #0d6efd;
      background: white;
      padding: 10px;
      border-radius: 4px;
      opacity: 0.9;
    }
    
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    
    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    
    .cdk-drag-placeholder {
      opacity: 0.4;
      border: 2px dashed #0d6efd;
      background: #f8f9fa;
      min-height: 100px;
    }
    
    /* Visual feedback for hierarchy */
    .card[class*="border-primary"] {
      border-left-color: #0d6efd !important;
      background: rgba(13, 110, 253, 0.02);
    }
    
    .card[class*="ms-4"] {
      transition: margin-left 0.3s ease, background-color 0.3s ease;
    }
    
    /* Drag and drop visual hints */
    .cdk-drop-list-dragging .card[class*="ms-4"] {
      /* Highlight child items during drag to show they can be re-parented */
      background: rgba(13, 110, 253, 0.05);
    }
    
    .cdk-drop-list-dragging .card:not([class*="ms-4"]) {
      /* Highlight parent items as valid drop zones */
      background: rgba(25, 135, 84, 0.05);
    }
    
    /* Visual indicator for drag over parent */
    .cdk-drag-placeholder + .card:not([class*="ms-4"]) {
      border-top: 3px solid #198754;
    }
    
    /* Hide 3-dot menu by default, show on hover */
    .nav-item-actions {
      opacity: 0;
      transition: opacity 0.15s ease-in-out;
    }
    
    .list-group-item:hover .nav-item-actions {
      opacity: 1;
    }
    
    /* Hide NgBootstrap dropdown caret */
    .nav-item-actions [ngbDropdownToggle]::after {
      display: none !important;
    }

    /* Navigation: fit to viewport (sticky top is ~66px) */
    .nav-scroll-container {
      max-height: calc(100vh - 253px);
      overflow-y: auto;
    }

    /* Navigation search highlighting */
    .list-group-item.nav-item-match {
      background-color: rgba(255, 193, 7, 0.12);
    }

    .list-group-item.nav-item-match:hover {
      background-color: rgba(255, 193, 7, 0.18);
    }

    .list-group-item.nav-item-invalid {
      border-left: 3px solid #dc3545 !important;
      background-color: rgba(220, 53, 69, 0.18) !important;
    }

    .list-group-item.nav-item-invalid:hover,
    .list-group-item.nav-item-invalid:focus,
    .list-group-item.nav-item-invalid:active,
    .list-group-item.nav-item-invalid.bg-body-secondary {
      background-color: rgba(220, 53, 69, 0.18) !important;
    }

    /* Main editor: sticky parent banner while scrolling through children */
    .sticky-parent-banner {
      position: sticky;
      top: 66px;
      z-index: 5;
      background: rgba(248, 249, 250, 0.98);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      margin: 0.25rem 0 0.75rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    }

    /* Quill auto-height editors */
    :host ::ng-deep .quill-auto-height .ql-container {
      height: auto;
    }

    :host ::ng-deep .quill-auto-height .ql-editor {
      overflow: visible;
    }

    :host ::ng-deep .quill-template .ql-editor {
      min-height: 120px;
    }

    :host ::ng-deep .quill-item .ql-editor {
      min-height: 200px;
    }
  `]
})
export class ChecklistTemplateEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('importModal') importModalRef!: TemplateRef<any>;
  @ViewChild('imagePreviewModal') imagePreviewModalRef!: TemplateRef<any>;
  @ViewChild('videoPreviewModal') videoPreviewModalRef!: TemplateRef<any>;
  @ViewChild('previewModal') previewModalRef!: TemplateRef<any>;
  @ViewChild('linksModalTemplate') linksModalTemplate: any;
  @ViewChildren('itemTitleInput') itemTitleInputs!: QueryList<ElementRef<HTMLInputElement>>;

  templateForm: FormGroup;
  editingTemplate: ChecklistTemplate | null = null;
  saving = false;
  loading = false;
  uploadingImage = false;
  selectedQualityDocument: QualityDocumentSelection | null = null;
  today = new Date();

  private static quillFileProtocolEnabled = false;
  private applyingAutoLinks = false;

  // Import functionality
  importing = false;
  importError: string | null = null;
  importManualName = '';
  importManualItemCount = 5;

  // Sample image management - single image per item
  sampleImages: { [itemIndex: number]: SampleImage | SampleImage[] | null } = {};
  sampleVideos: { [itemIndex: number]: SampleVideo | SampleVideo[] | null } = {};
  currentModalItemIndex: number = -1;
  currentLinksItemIndex: number = -1;

  // Navigation tree expansion state
  expandedItems: Set<number> = new Set<number>();

  // Navigation search/filter
  navSearchTerm = '';
  navSearchMatchCount = 0;
  private navSearchMatchedIndices = new Set<number>();
  private navSearchVisibleIndices = new Set<number>();
  private savedExpandedItemsBeforeSearch: Set<number> | null = null;
  private lastNormalizedSearchTerm = '';

  // Navigation view mode
  navViewMode: 'all' | 'groups' | 'items' = 'all';

  // Selected item for focused editing (null means show all)
  selectedFormItemIndex: number | null = null;

  // Focused edit mode toggle - when true, clicking items shows only that item; when false, just scrolls
  focusedEditMode: boolean = false;

  // Active item tracking for scroll highlighting
  activeNavItemIndex: number = -1;
  stickyParentIndex: number | null = null;
  private scrollCheckTimeout: any = null;
  private boundScrollHandler: (() => void) | null = null;
  private activeItemObserver: IntersectionObserver | null = null;
  private visibleItemEntries: Map<number, IntersectionObserverEntry> = new Map();
  private scheduledFallbackCheck = false;

  // Modal template references
  @ViewChild('sampleImagesModalTemplate') sampleImagesModalTemplate: any;
  @ViewChild('sampleVideoModalTemplate') sampleVideoModalTemplate: any;

  // Image preview
  previewImageUrl: string | null = null;
  // Video preview
  previewVideoUrl: string | null = null;

  // Video upload state
  uploadingVideo = false;

  // Auto-save functionality
  autoSaveEnabled = false;
  lastSavedAt: Date | null = null;
  private autoSaveTimeout: any = null;

  // Quill editor configuration
  quillConfig: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  constructor(
    private fb: FormBuilder,
    public route: ActivatedRoute,
    private router: Router,
    private configService: PhotoChecklistConfigService,
    private modalService: NgbModal,
    private attachmentsService: AttachmentsService,
    private uploadService: UploadService,
    private photoUploadService: PhotoChecklistUploadService,
    private cdr: ChangeDetectorRef,
    private pdfParser: PdfParserService,
    private wordParser: WordParserService,
    private sanitizer: DomSanitizer
  ) {
    this.ensureQuillFileLinksEnabled();
    this.templateForm = this.createTemplateForm();
  }

  printChecklist(): void {
    window.print();
  }

  private ensureQuillFileLinksEnabled(): void {
    if (ChecklistTemplateEditorComponent.quillFileProtocolEnabled) {
      return;
    }

    try {
      const Link = (Quill as any).import('formats/link');
      if (Link?.PROTOCOL_WHITELIST && Array.isArray(Link.PROTOCOL_WHITELIST)) {
        if (!Link.PROTOCOL_WHITELIST.includes('file')) {
          Link.PROTOCOL_WHITELIST.push('file');
          (Quill as any).register(Link, true);
        }
        ChecklistTemplateEditorComponent.quillFileProtocolEnabled = true;
      }
    } catch {
      // If Quill internals change or aren't available, just skip the whitelist patch.
    }
  }

  onQuillContentChanged(event: any): void {
    const editor = event?.editor;
    const source = event?.source;
    if (!editor || source !== 'user' || this.applyingAutoLinks) {
      return;
    }

    const text: string = editor.getText?.() ?? '';
    if (!text || (!text.includes('\\') && !text.toLowerCase().includes('http') && !/\b[A-Z]:\\/.test(text))) {
      return;
    }

    const matches = this.findAutoLinkMatches(text);
    if (matches.length === 0) {
      return;
    }

    this.applyingAutoLinks = true;
    try {
      for (const match of matches) {
        const existing = editor.getFormat?.(match.index, match.length);
        if (existing?.link) {
          continue;
        }
        editor.formatText(match.index, match.length, 'link', match.href, 'silent');
      }
    } finally {
      this.applyingAutoLinks = false;
    }
  }

  private findAutoLinkMatches(text: string): Array<{ index: number; length: number; href: string }> {
    const results: Array<{ index: number; length: number; href: string }> = [];

    const add = (index: number, raw: string, href: string) => {
      let value = raw;
      while (value.length > 0 && /[\s\]\)\}\.,;:!?]+$/.test(value)) {
        value = value.replace(/[\s\]\)\}\.,;:!?]+$/, '');
      }
      if (!value) {
        return;
      }
      results.push({ index, length: value.length, href });
    };

    // http/https URLs
    const httpRegex = /\bhttps?:\/\/[^\s<]+/gi;
    let m: RegExpExecArray | null;
    while ((m = httpRegex.exec(text)) !== null) {
      add(m.index, m[0], m[0]);
    }

    // www.* URLs -> https://www.*
    const wwwRegex = /\bwww\.[^\s<]+/gi;
    while ((m = wwwRegex.exec(text)) !== null) {
      add(m.index, m[0], `https://${m[0]}`);
    }

    // Windows drive paths (link to file:///)
    const drivePathRegex = /\b[A-Z]:\\[^\n\r<>]+/g;
    while ((m = drivePathRegex.exec(text)) !== null) {
      const raw = m[0];
      const normalized = raw.replace(/\\/g, '/');
      const href = encodeURI(`file:///${normalized}`);
      add(m.index, raw, href);
    }

    // UNC paths (e.g. \\server\share\folder\file)
    const uncRegex = /\\\\[^\n\r<>]+/g;
    while ((m = uncRegex.exec(text)) !== null) {
      const raw = m[0];
      const uncNoPrefix = raw.replace(/^\\\\/, '');
      const normalized = uncNoPrefix.replace(/\\/g, '/');
      const href = encodeURI(`file://${normalized}`);
      add(m.index, raw, href);
    }

    // Prefer longer matches first to avoid partial overlaps.
    results.sort((a, b) => (b.length - a.length) || (a.index - b.index));

    // Drop overlaps.
    const filtered: typeof results = [];
    for (const r of results) {
      const overlaps = filtered.some(f => !(r.index + r.length <= f.index || f.index + f.length <= r.index));
      if (!overlaps) {
        filtered.push(r);
      }
    }
    filtered.sort((a, b) => a.index - b.index);
    return filtered;
  }

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.loadTemplate(parseInt(templateId));
    }

    // Expand all parent items by default in navigation
    this.initializeNavExpansion();

    // Enable auto-save after form changes (with 3 second debounce)
    this.templateForm.valueChanges.subscribe(() => {
      if (this.autoSaveEnabled && this.editingTemplate) {
        this.scheduleAutoSave();
      }
    });
  }

  ngAfterViewInit(): void {
    this.refreshActiveItemTracking();
    // Ensure initial highlight is correct
    this.checkActiveItem();
  }

  createTemplateForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      // Optional override (MB) for maximum upload size when editing this template
      max_upload_size_mb: [null],
      // When true, disable max upload size checks for this template (use with caution)
      disable_max_upload_limit: [true],
      part_number: [''],
      product_type: [''],
      customer_part_number: [''],
      revision: [''],
      original_filename: [''],
      review_date: [''],
      revision_number: [''],
      revision_details: [''],
      revised_by: [''],
      is_active: [true],
      quality_document_id: [null], // Add quality document field
      items: this.fb.array([])
    });
  }

  /**
   * Return effective maximum upload size in bytes.
   * If a per-template override (max_upload_size_mb) is set, use that (MB -> bytes).
   * Otherwise use sensible defaults per file type.
   */
  getMaxUploadBytes(fileType: 'image' | 'video'): number {
    // If the template explicitly disables the upload limit, return a very large value
    const disabled = !!this.templateForm.get('disable_max_upload_limit')?.value;
    if (disabled) {
      return Number.MAX_SAFE_INTEGER; // Effectively disable client-side size checks
    }

    const overrideMb = Number(this.templateForm.get('max_upload_size_mb')?.value || 0);
    if (overrideMb && overrideMb > 0) {
      return overrideMb * 1024 * 1024;
    }

    // Defaults
    if (fileType === 'video') return 50 * 1024 * 1024; // 50MB
    return 5 * 1024 * 1024; // 5MB for images
  }

  get items(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  getItemFormGroup(index: number): FormGroup | null {
    if (index < 0 || index >= this.items.length) {
      return null;
    }
    return this.items.at(index) as FormGroup;
  }

  loadTemplate(id: number): void {
    this.loading = true;
    this.configService.getTemplate(id).subscribe({
      next: (template) => {
        if (!template) {
          console.error('Template not found');
          alert('Template not found. Redirecting to template manager.');
          this.router.navigate(['/quality/template-manager']);
          this.loading = false;
          return;
        }
        this.editingTemplate = template;
        this.populateForm(template);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.loading = false;
        alert('Error loading template: ' + (error.message || 'Unknown error'));
        this.router.navigate(['/quality/template-manager']);
      }
    });
  }

  populateForm(template: ChecklistTemplate): void {
    if (!template) {
      console.error('populateForm called with null template');
      return;
    }

    this.templateForm.patchValue({
      name: template.name,
      category: template.category,
      description: template.description,
      max_upload_size_mb: (template as any).max_upload_size_mb || null,
      disable_max_upload_limit: (template as any).disable_max_upload_limit || false,
      part_number: template.part_number,
      customer_part_number: template.customer_part_number,
      revision: template.revision,
      original_filename: template.original_filename,
      review_date: template.review_date,
      revision_number: template.revision_number,
      revision_details: template.revision_details,
      revised_by: template.revised_by,
      product_type: template.product_type,
      is_active: template.is_active,
      quality_document_id: template.quality_document_metadata?.document_id || null
    });

    // Clear existing items and sample images
    while (this.items.length) {
      this.items.removeAt(0);
    }
    this.sampleImages = {};

    // Recursively flatten nested items structure to flat list
    const flattenedItems = this.flattenNestedItems(template.items || []);

    // Add template items and their sample images
    if (flattenedItems.length > 0) {
      flattenedItems.forEach((item, index) => {
        this.items.push(this.createItemFormGroup(item));

        // Load sample images - handle both array format and single URL
        if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
          // Array format: Load all images (primary + references)
          const loadedImages: SampleImage[] = item.sample_images.map((img: any, imgIndex: number) => ({
            id: `loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${imgIndex}`,
            url: img.url,
            label: img.label || (img.is_primary ? 'Sample Image' : `Reference ${imgIndex}`),
            description: img.description || '',
            type: img.type || 'photo',
            image_type: img.image_type || (img.is_primary ? 'sample' : 'reference'),
            is_primary: img.is_primary || false,
            order_index: img.order_index || imgIndex,
            status: 'loaded' as const
          }));

          this.sampleImages[index] = loadedImages;

          // Update the form control with all images
          const itemFormGroup = this.items.at(index) as FormGroup;
          if (itemFormGroup) {
            itemFormGroup.patchValue({
              sample_image_url: item.sample_image_url || loadedImages.find(img => img.is_primary)?.url || loadedImages[0]?.url,
              sample_images: loadedImages,
              sample_videos: (item.sample_videos && Array.isArray(item.sample_videos)) ? item.sample_videos : [],
              photo_requirements: {
                ...(itemFormGroup.get('photo_requirements')?.value || {}),
                submission_type: (item as any)?.photo_requirements?.submission_type || 'photo',
                max_video_duration_seconds: (item as any)?.photo_requirements?.max_video_duration_seconds || 30
              },
              submission_time_seconds: (item as any)?.submission_time_seconds || null
            });
          }

          // Also populate the sampleVideos component property so display methods work
          if (item.sample_videos && Array.isArray(item.sample_videos) && item.sample_videos.length > 0) {
            this.sampleVideos[index] = item.sample_videos;
          }
        } else if (item.sample_image_url) {
          // Single URL format: Just the primary image
          this.sampleImages[index] = {
            id: `loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: item.sample_image_url,
            label: 'Sample Image',
            description: '',
            type: 'photo',
            image_type: 'sample',
            is_primary: true,
            order_index: 0,
            status: 'loaded' as const
          };

          // Update the form control with the loaded sample image URL
          const itemFormGroup = this.items.at(index) as FormGroup;
          if (itemFormGroup) {
            itemFormGroup.patchValue({
              sample_image_url: item.sample_image_url,
              sample_images: [this.sampleImages[index] as SampleImage],
              sample_videos: (item.sample_videos && Array.isArray(item.sample_videos)) ? item.sample_videos : [],
              photo_requirements: {
                ...(itemFormGroup.get('photo_requirements')?.value || {}),
                submission_type: (item as any)?.photo_requirements?.submission_type || 'photo',
                max_video_duration_seconds: (item as any)?.photo_requirements?.max_video_duration_seconds || 30
              },
              submission_time_seconds: (item as any)?.submission_time_seconds || null
            });
          }

          // Also populate the sampleVideos component property so display methods work
          if (item.sample_videos && Array.isArray(item.sample_videos) && item.sample_videos.length > 0) {
            this.sampleVideos[index] = item.sample_videos;
          }
        }
      });
    }

    // Recalculate order indices to ensure correct outline numbering display
    this.recalculateOrderIndices();

    // Reinitialize navigation + tracking after loading items
    this.expandedItems.clear();
    this.initializeNavExpansion();
    this.updateNavSearchSets();
    this.cdr.detectChanges();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  /**
   * Recursively flatten nested items structure to flat array
   * Converts children arrays to flat list with level/parent_id preserved
   * @param items Nested items array (may contain children arrays)
   * @param level Current nesting level (0 for root)
   * @param parentId Parent item's database ID
   * @returns Flat array of items in display order
   */
  private flattenNestedItems(items: any[], level: number = 0, parentId: number | null = null): any[] {
    const result: any[] = [];

    items.forEach(item => {
      // Add current item with level/parent_id metadata
      const flatItem = {
        ...item,
        level: level,
        parent_id: parentId
      };

      // Remove children array from the item itself (we'll flatten it)
      const children = flatItem.children;
      delete flatItem.children;

      result.push(flatItem);

      // Recursively flatten children
      if (children && Array.isArray(children) && children.length > 0) {
        const flattenedChildren = this.flattenNestedItems(children, level + 1, item.id);
        result.push(...flattenedChildren);
      }
    });

    return result;
  }

  createItemFormGroup(item?: ChecklistItem): FormGroup {
    return this.fb.group({
      id: [item?.id || null], // Include ID for change detection
      title: [item?.title || '', Validators.required],
      description: [item?.description || '', Validators.required],
      is_required: [item?.is_required || false],
      order_index: [item?.order_index || this.items.length + 1],
      // TOP-LEVEL: submission_type is a separate ENUM column in database (photo, video, either)
      submission_type: [(item as any)?.submission_type || 'photo'],
      links: this.buildLinksFormArray((item as any)?.links || []),
      photo_requirements: this.fb.group({
        angle: [(item as any)?.photo_requirements?.angle || ''],
        distance: [(item as any)?.photo_requirements?.distance || ''],
        lighting: [(item as any)?.photo_requirements?.lighting || ''],
        focus: [(item as any)?.photo_requirements?.focus || ''],
        min_photos: [(item as any)?.photo_requirements?.min_photos || null],
        max_photos: [(item as any)?.photo_requirements?.max_photos || null],
        picture_required: [(item as any)?.photo_requirements?.picture_required !== undefined ? (item as any)?.photo_requirements?.picture_required : true], // Default to true
        max_video_duration_seconds: [(item as any)?.photo_requirements?.max_video_duration_seconds || 30]
      }),
      // TOP-LEVEL: per-item submission time limit (in seconds). Stored in video_requirements JSON. Null or 0 = no limit
      submission_time_seconds: [(item as any)?.submission_time_seconds || null],
      sample_image_url: [item?.sample_image_url || item?.sample_images?.[0]?.url || null], // Use sample_image_url or first sample_images URL
      sample_images: [item?.sample_images || null], // NEW: Array of all sample/reference images
      sample_videos: [(item as any)?.sample_videos && Array.isArray((item as any)?.sample_videos) ? (item as any).sample_videos : []], // NEW: Array of sample videos (init as empty array)
      level: [item?.level || 0], // 0 = parent, 1 = child
      parent_id: [item?.parent_id || null] // Reference to parent item
    });
  }

  /**
   * Helper method to add an item to the form with its sample images
   * Used during PDF import to handle both parent and child items
   */
  private addItemToForm(item: any, formIndex: number, parentId?: number): void {
    const itemGroup = this.createItemFormGroup();

    // Determine sample image URL
    let sampleImageUrl: string | null = null;
    let hasImages = false;

    // Check if item has sample_images array (from PDF/Word import)
    if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
      hasImages = true;
      // Use the first (or primary) image
      const primaryImage = item.sample_images.find((img: any) => img.is_primary) || item.sample_images[0];
      sampleImageUrl = primaryImage.url;

      // Store in sampleImages dictionary for UI display
      this.sampleImages[formIndex] = {
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: primaryImage.url,
        label: primaryImage.label || 'Sample Image',
        description: primaryImage.description || '',
        type: primaryImage.type || 'photo',
        is_primary: true,
        order_index: 0,
        status: 'loaded'
      };

      // Trigger change detection
      this.cdr.detectChanges();
    }

    itemGroup.patchValue({
      title: item.title,
      description: item.description || '',
      order_index: item.order_index,
      is_required: item.is_required !== undefined ? item.is_required : true,
      submission_type: (item as any)?.submission_type || 'photo', // TOP-LEVEL: Separate ENUM column
      sample_image_url: sampleImageUrl,
      level: item.level || 0,
      parent_id: parentId || item.parent_id || null,
      photo_requirements: {
        angle: item.photo_requirements?.angle || '',
        distance: item.photo_requirements?.distance || '',
        lighting: item.photo_requirements?.lighting || '',
        focus: item.photo_requirements?.focus || '',
        min_photos: item.photo_requirements?.min_photos || 1,
        max_photos: item.photo_requirements?.max_photos || 5,
        picture_required: hasImages, // Set to false if no images, true if images exist
        max_video_duration_seconds: (item as any)?.photo_requirements?.max_video_duration_seconds || 30
      },
      submission_time_seconds: (item as any)?.submission_time_seconds || null,
      sample_videos: (item as any)?.sample_videos || null
    });

    if (Array.isArray(item.links)) {
      itemGroup.setControl('links', this.buildLinksFormArray(item.links));
    }

    this.items.push(itemGroup);
  }

  private createLinkFormGroup(link?: ItemLink): FormGroup {
    return this.fb.group({
      title: [link?.title || '', Validators.required],
      url: [link?.url || '', Validators.required],
      description: [link?.description || '']
    });
  }

  private buildLinksFormArray(links?: ItemLink[] | null): FormArray {
    const linkItems = Array.isArray(links) ? links : [];
    return this.fb.array(linkItems.map(link => this.createLinkFormGroup({ ...link })));
  }

  getLinksFormArray(itemIndex: number): FormArray {
    const item = this.items.at(itemIndex) as FormGroup | undefined;
    const links = item?.get('links');
    return (links as FormArray) || this.fb.array([]);
  }

  addLink(itemIndex: number): void {
    this.getLinksFormArray(itemIndex).push(this.createLinkFormGroup());
    this.templateForm.markAsDirty();
  }

  removeLink(itemIndex: number, linkIndex: number): void {
    const links = this.getLinksFormArray(itemIndex);
    if (linkIndex >= 0 && linkIndex < links.length) {
      links.removeAt(linkIndex);
      this.templateForm.markAsDirty();
    }
  }

  openLinksModal(itemIndex: number): void {
    this.currentLinksItemIndex = itemIndex;
    this.modalService.open(this.linksModalTemplate, { size: 'lg', centered: true });
  }

  addItem(): void {
    const newIndex = this.items.length;
    this.items.push(this.createItemFormGroup());
    this.recalculateOrderIndices(); // Auto-calculate order after adding
    this.updateNavSearchSets();
    this.cdr.detectChanges();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  /**
   * Add a sub-item (child) under a parent item at the next nesting level
   */
  addSubItem(parentIndex: number): void {
    const parentItem = this.items.at(parentIndex);
    const parentLevel = parentItem.get('level')?.value || 0;
    const parentOrderIndex = parentItem.get('order_index')?.value || (parentIndex + 1);
    const parentDbId = parentItem.get('id')?.value; // Use database ID, not order_index

    // New child will be at parent level + 1
    const childLevel = parentLevel + 1;

    // Count existing children at this level for this parent
    let childCount = 0;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      const itemLevel = item.get('level')?.value || 0;
      const itemParentId = item.get('parent_id')?.value;

      // Stop when we hit an item at parent level or lower (sibling or uncle)
      if (itemLevel <= parentLevel) break;

      // Count direct children only (same level, same parent)
      if (itemLevel === childLevel && itemParentId === parentDbId) {
        childCount++;
      }
    }

    // Calculate the new sub-item's order_index (e.g., 5.1, 5.1.1, 5.1.1.1)
    const newOrderIndex = parentOrderIndex + ((childCount + 1) * Math.pow(0.1, childLevel));

    // Build outline number for the new item based on parent
    // Parent is 1 → child will be 1.1
    // Parent is 1.1 → child will be 1.1.1
    const parentOutlineNumber = this.getOutlineNumber(parentIndex);
    const newOutlineNumber = `${parentOutlineNumber}.${childCount + 1}`;

    // Create new sub-item with proper form group structure
    const subItem = this.fb.group({
      id: [null], // New item has no ID yet
      title: ['', Validators.required],
      description: ['', Validators.required],
      order_index: [newOrderIndex],
      is_required: [true],
      submission_type: ['photo'],
      links: this.fb.array([]),
      sample_image_url: [null],
      sample_images: [null],
      level: [childLevel],
      parent_id: [parentDbId], // Store database ID, not order_index
      photo_requirements: this.fb.group({
        angle: [''],
        distance: [''],
        lighting: [''],
        focus: [''],
        min_photos: [1],
        max_photos: [5],
        picture_required: [true],
        max_video_duration_seconds: [30]
      }),
      submission_time_seconds: [null],
      sample_videos: []
    });

    // Insert right after the last descendant of this parent (or after parent if no children)
    let insertIndex = parentIndex + 1;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const itemLevel = this.items.at(i).get('level')?.value || 0;
      // Stop when we hit an item at parent level or lower
      if (itemLevel <= parentLevel) break;
      insertIndex = i + 1;
    }

    this.items.insert(insertIndex, subItem);

    const shiftOnInsert = <T>(dict: { [itemIndex: number]: T }): { [itemIndex: number]: T } => {
      const updated: { [itemIndex: number]: T } = {};
      Object.keys(dict).forEach((key) => {
        const oldIndex = parseInt(key, 10);
        const newIndex = oldIndex >= insertIndex ? oldIndex + 1 : oldIndex;
        updated[newIndex] = dict[oldIndex];
      });
      return updated;
    };

    // Shift sample media dictionaries so the new sub-item starts clean
    this.sampleImages = shiftOnInsert(this.sampleImages);
    this.sampleVideos = shiftOnInsert(this.sampleVideos);

    // Shift expanded items and active index (index-based state)
    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      const newIndex = oldIndex >= insertIndex ? oldIndex + 1 : oldIndex;
      updatedExpanded.add(newIndex);
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= insertIndex) {
      this.activeNavItemIndex = this.activeNavItemIndex + 1;
    }

    this.recalculateOrderIndices(); // Auto-calculate order after adding sub-item

    // Trigger change detection to ensure UI updates
    this.cdr.detectChanges();

    this.updateNavSearchSets();
    setTimeout(() => {
      this.refreshActiveItemTracking();
      const input = this.itemTitleInputs?.toArray?.()[insertIndex];
      if (input?.nativeElement) {
        input.nativeElement.focus();
        input.nativeElement.select();
      }
    });
  }

  /**
   * Promote item up one level (decrease nesting)
   */
  promoteItem(index: number): void {
    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value || 0;

    if (currentLevel === 0) return; // Already at top level

    // Move up one level
    const newLevel = currentLevel - 1;
    item.patchValue({ level: newLevel });

    // Update parent_id to grandparent's database ID
    if (newLevel === 0) {
      item.patchValue({ parent_id: null });
    } else {
      // Find new parent (previous item at new level - 1)
      for (let i = index - 1; i >= 0; i--) {
        const prevItem = this.items.at(i);
        const prevLevel = prevItem.get('level')?.value || 0;
        if (prevLevel === newLevel - 1) {
          item.patchValue({ parent_id: prevItem.get('id')?.value }); // Use database ID
          break;
        }
      }
    }

    // Recursively promote all descendants
    this.promoteDescendants(index, currentLevel);

    this.recalculateOrderIndices(); // Auto-calculate order

    this.cdr.detectChanges();
  }

  /**
   * Demote item (nest under previous sibling)
   */
  demoteItem(index: number): void {
    if (index === 0) return; // Can't demote first item

    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value || 0;

    // Find previous sibling or parent at same/lower level
    let newParentIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      const prevItem = this.items.at(i);
      const prevLevel = prevItem.get('level')?.value || 0;

      if (prevLevel < currentLevel) {
        // Found parent level - this becomes new parent
        newParentIndex = i;
        break;
      } else if (prevLevel === currentLevel) {
        // Found sibling - nest under this
        newParentIndex = i;
        break;
      }
    }

    if (newParentIndex === -1) return;

    const newParent = this.items.at(newParentIndex);
    const newParentLevel = newParent.get('level')?.value || 0;
    const newLevel = newParentLevel + 1;

    item.patchValue({
      level: newLevel,
      parent_id: newParent.get('id')?.value // Use database ID
    });

    // Recursively demote all descendants
    this.demoteDescendants(index, currentLevel, newLevel - currentLevel);

    this.recalculateOrderIndices(); // Auto-calculate order

    this.cdr.detectChanges();
  }

  /**
   * Check if item can be demoted (has a previous sibling or parent to nest under)
   */
  canDemote(index: number): boolean {
    if (index === 0) return false;

    const currentLevel = this.items.at(index).get('level')?.value || 0;
    const prevLevel = this.items.at(index - 1).get('level')?.value || 0;

    // Can demote if previous item is at same level or higher (less nested)
    return prevLevel <= currentLevel;
  }

  /**
   * Recursively promote all descendants by one level
   */
  private promoteDescendants(parentIndex: number, parentOldLevel: number): void {
    const parentOrderIndex = this.items.at(parentIndex).get('order_index')?.value;

    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      const itemLevel = item.get('level')?.value || 0;
      const itemParentId = item.get('parent_id')?.value;

      // Stop when we hit item at parent's old level or lower
      if (itemLevel <= parentOldLevel) break;

      // Promote this descendant
      item.patchValue({ level: itemLevel - 1 });
    }
  }

  /**
   * Recursively demote all descendants
   */
  private demoteDescendants(parentIndex: number, parentOldLevel: number, levelDelta: number): void {
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      const itemLevel = item.get('level')?.value || 0;

      // Stop when we hit item at parent's old level or lower
      if (itemLevel <= parentOldLevel) break;

      // Demote this descendant
      item.patchValue({ level: itemLevel + levelDelta });
    }
  }

  /**
   * Get label for nesting level (Sub-item, Sub-sub-item, etc.)
   */
  getLevelLabel(level: number): string {
    if (!level || level === 0) return 'Item';
    if (level === 1) return 'Sub-item';
    if (level === 2) return 'Sub-sub-item';

    // For deeper levels, use numeric representation
    const prefix = 'Sub-'.repeat(level);
    return `${prefix}item`;
  }

  removeItem(index: number): void {
    const item = this.items.at(index);
    const itemLevel = item.get('level')?.value || 0;

    // Collect all descendants (children, grandchildren, etc.)
    const itemsToRemove: number[] = [index];

    for (let i = index + 1; i < this.items.length; i++) {
      const checkItem = this.items.at(i);
      const checkLevel = checkItem.get('level')?.value || 0;

      // Stop when we hit an item at same or lower level (sibling or uncle)
      if (checkLevel <= itemLevel) break;

      // This is a descendant - mark for removal
      itemsToRemove.push(i);
    }

    const removedSorted = [...itemsToRemove].sort((a, b) => a - b);
    const removedSet = new Set<number>(itemsToRemove);
    const oldImages = { ...this.sampleImages };
    const oldVideos = { ...this.sampleVideos };

    // Remove from bottom to top to maintain indices
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
      const removeIndex = itemsToRemove[i];
      this.items.removeAt(removeIndex);
    }

    const shiftByRemovedBefore = (oldIndex: number): number => {
      let shift = 0;
      for (const r of removedSorted) {
        if (r < oldIndex) shift++;
      }
      return shift;
    };

    // Rebuild sample media dictionaries with updated indices
    this.sampleImages = {};
    Object.keys(oldImages).forEach(key => {
      const oldIndex = parseInt(key, 10);
      if (removedSet.has(oldIndex)) return;
      const newIndex = oldIndex - shiftByRemovedBefore(oldIndex);
      this.sampleImages[newIndex] = oldImages[oldIndex];
    });

    this.sampleVideos = {};
    Object.keys(oldVideos).forEach(key => {
      const oldIndex = parseInt(key, 10);
      if (removedSet.has(oldIndex)) return;
      const newIndex = oldIndex - shiftByRemovedBefore(oldIndex);
      this.sampleVideos[newIndex] = oldVideos[oldIndex];
    });

    // Shift expanded items and active index
    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      if (removedSet.has(oldIndex)) return;
      const newIndex = oldIndex - shiftByRemovedBefore(oldIndex);
      updatedExpanded.add(newIndex);
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= 0) {
      if (removedSet.has(this.activeNavItemIndex)) {
        this.activeNavItemIndex = -1;
      } else {
        this.activeNavItemIndex = this.activeNavItemIndex - shiftByRemovedBefore(this.activeNavItemIndex);
      }
    }

    this.recalculateOrderIndices();
    this.updateNavSearchSets();
    this.cdr.detectChanges();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  dropItem(event: CdkDragDrop<string[]>): void {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;

    if (previousIndex === currentIndex) {
      return; // No change
    }

    this.performDrop(previousIndex, currentIndex);
  }

  /**
   * Handle drop in navigation (needs to map visible indices to actual indices)
   */
  dropNavItem(event: CdkDragDrop<string[]>): void {
    const visibleIndices = this.getVisibleItemIndices();

    if (event.previousIndex >= visibleIndices.length || event.currentIndex >= visibleIndices.length) {
      return; // Invalid indices
    }

    const actualPrevIndex = visibleIndices[event.previousIndex];
    const actualCurrentIndex = visibleIndices[event.currentIndex];

    if (actualPrevIndex === actualCurrentIndex) {
      return; // No change
    }

    this.performDrop(actualPrevIndex, actualCurrentIndex);
  }

  /**
   * Get array of actual indices for currently visible items in navigation
   */
  getVisibleItemIndices(): number[] {
    const visibleIndices: number[] = [];
    this.items.controls.forEach((item, i) => {
      if (this.isNavItemVisible(i)) {
        visibleIndices.push(i);
      }
    });
    return visibleIndices;
  }

  /**
   * Perform the actual drop operation (shared by main form and navigation)
   */
  private performDrop(previousIndex: number, currentIndex: number): void {

    const movedItem = this.items.at(previousIndex);
    const movedLevel = movedItem.get('level')?.value || 0;
    const movedOrderIndex = movedItem.get('order_index')?.value;

    // Move the item in the array
    moveItemInArray(this.items.controls, previousIndex, currentIndex);

    const reindexOnMove = <T>(dict: { [itemIndex: number]: T }): { [itemIndex: number]: T } => {
      const updated: { [itemIndex: number]: T } = {};
      Object.keys(dict).forEach((key) => {
        const oldIndex = parseInt(key, 10);
        let newIndex = oldIndex;

        if (oldIndex === previousIndex) {
          newIndex = currentIndex;
        } else if (previousIndex < currentIndex) {
          if (oldIndex > previousIndex && oldIndex <= currentIndex) {
            newIndex = oldIndex - 1;
          }
        } else {
          if (oldIndex >= currentIndex && oldIndex < previousIndex) {
            newIndex = oldIndex + 1;
          }
        }

        updated[newIndex] = dict[oldIndex];
      });
      return updated;
    };

    this.sampleImages = reindexOnMove(this.sampleImages);
    this.sampleVideos = reindexOnMove(this.sampleVideos);

    // Shift expanded items and active index (index-based state)
    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      let newIndex = oldIndex;
      if (oldIndex === previousIndex) {
        newIndex = currentIndex;
      } else if (previousIndex < currentIndex) {
        if (oldIndex > previousIndex && oldIndex <= currentIndex) {
          newIndex = oldIndex - 1;
        }
      } else {
        if (oldIndex >= currentIndex && oldIndex < previousIndex) {
          newIndex = oldIndex + 1;
        }
      }
      updatedExpanded.add(newIndex);
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= 0) {
      let newActive = this.activeNavItemIndex;
      if (newActive === previousIndex) {
        newActive = currentIndex;
      } else if (previousIndex < currentIndex) {
        if (newActive > previousIndex && newActive <= currentIndex) {
          newActive = newActive - 1;
        }
      } else {
        if (newActive >= currentIndex && newActive < previousIndex) {
          newActive = newActive + 1;
        }
      }
      this.activeNavItemIndex = newActive;
    }

    // Check what's around the dropped position to determine new parent
    const itemAbove = currentIndex > 0 ? this.items.at(currentIndex - 1) : null;
    const itemBelow = currentIndex < this.items.length - 1 ? this.items.at(currentIndex + 1) : null;

    const aboveLevel = itemAbove?.get('level')?.value || 0;
    const belowLevel = itemBelow?.get('level')?.value || 0;
    const aboveOrderIndex = itemAbove?.get('order_index')?.value;
    const aboveParentId = itemAbove?.get('parent_id')?.value;
    const aboveDbId = itemAbove?.get('id')?.value; // Database ID

    // Smart re-parenting based on drop position
    if (itemAbove === null) {
      movedItem.get('level')?.setValue(0);
      movedItem.get('parent_id')?.setValue(null);
    } else if (aboveLevel === 0 && (belowLevel === 1 || itemBelow === null)) {
      // Dropped below a parent item - become its child
      movedItem.get('level')?.setValue(1);
      movedItem.get('parent_id')?.setValue(aboveDbId); // Use database ID
    } else if (aboveLevel === 1) {
      // Dropped below a child - become sibling
      movedItem.get('level')?.setValue(1);
      movedItem.get('parent_id')?.setValue(aboveParentId); // Same parent
    } else if (aboveLevel === 0 && belowLevel === 0) {
      // Dropped between two parents
      movedItem.get('level')?.setValue(0);
      movedItem.get('parent_id')?.setValue(null);
    }

    // If moving a parent item, also move all its children
    if (movedLevel === 0) {
      const movedItemDbId = movedItem.get('id')?.value; // Use database ID
      const children: { index: number, control: any }[] = [];

      // Find all children of the moved parent (before the move)
      this.items.controls.forEach((item, index) => {
        if (item.get('parent_id')?.value === movedItemDbId && index !== currentIndex) {
          children.push({ index, control: item });
        }
      });

      // Move children to be right after their parent
      if (children.length > 0) {
        // Sort by current position (descending) to avoid index conflicts
        children.sort((a, b) => b.index - a.index);

        // Move each child to right after parent
        children.forEach((child, i) => {
          const targetIndex = currentIndex + 1 + i;
          const currentChildIndex = this.items.controls.indexOf(child.control);

          if (currentChildIndex !== targetIndex) {
            moveItemInArray(this.items.controls, currentChildIndex, targetIndex);
          }
        });
      }
    }

    // Recalculate order_index for all items to maintain proper sequence
    this.recalculateOrderIndices();
    this.updateNavSearchSets();

    // Trigger change detection
    this.cdr.detectChanges();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  /**
   * Recalculate order_index for all items using outline numbering (1, 1.1, 1.1.1, 1.1.1.1)
   * Industry standard for quality checklists - clear hierarchy, easy to reference
   */
  private recalculateOrderIndices(): void {
    // Track counters at each level for each parent path
    const counterStack: number[] = [0]; // Start with 0 at root level
    const parentIdStack: (number | null)[] = [null]; // Track parent IDs for each level

    this.items.controls.forEach((control, index) => {
      const level = control.get('level')?.value || 0;
      const parentId = control.get('parent_id')?.value;

      // Adjust stack size to current level + 1
      while (counterStack.length > level + 1) {
        counterStack.pop();
        parentIdStack.pop();
      }
      while (counterStack.length < level + 1) {
        counterStack.push(0);
        parentIdStack.push(null);
      }

      // Check if we've moved to a different parent - reset counter if so
      if (level > 0 && parentIdStack[level] !== parentId) {
        counterStack[level] = 0;
        parentIdStack[level] = parentId;
      }

      // Increment counter at current level
      counterStack[level]++;

      // Build outline number: 1, 1.01, 1.0101, 1.010101
      // Pad each level to 2 digits so parseFloat works correctly
      let outlineNumber: number;
      if (level === 0) {
        // Root level: 1, 2, 3
        outlineNumber = counterStack[0];
      } else {
        // Build hierarchical number by padding each level to 2 digits
        // Example: [1, 2, 3, 1] at level 3 → "1.020301" → 1.020301
        const root = counterStack[0];
        const subLevels = counterStack.slice(1, level + 1)
          .map(num => num.toString().padStart(2, '0'))
          .join('');
        const fullString = `${root}.${subLevels}`;
        outlineNumber = parseFloat(fullString);
      }

      control.get('order_index')?.setValue(outlineNumber);
    });
  }

  /**
   * Promote a child item to become a parent item
   */
  promoteToParent(index: number): void {
    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value;

    if (currentLevel !== 1) {
      return; // Only promote child items
    }

    // Change to parent
    item.get('level')?.setValue(0);
    item.get('parent_id')?.setValue(null);

    // Recalculate all order indices
    this.recalculateOrderIndices();
  }

  onQualityDocumentSelected(document: QualityDocumentSelection | null): void {
    this.selectedQualityDocument = document;
    this.templateForm.get('quality_document_id')?.setValue(document?.documentId || null);
  }

  getSampleImage(itemIndex: number): SampleImage | null {
    const sampleImage = this.sampleImages[itemIndex] || null;

    // If it's an array, return the primary or first image for backward compatibility
    if (Array.isArray(sampleImage)) {
      const primary = sampleImage.find(img => img.is_primary);
      const firstImage = primary || sampleImage[0] || null;

      // Convert relative URLs to absolute URLs (but skip data URLs)
      if (firstImage && firstImage.url && !firstImage.url.startsWith('data:')) {
        firstImage.url = this.getAbsoluteImageUrl(firstImage.url);
      }

      return firstImage;
    }

    // Single image - convert relative URLs to absolute URLs (but skip data URLs)
    if (sampleImage && sampleImage.url && !sampleImage.url.startsWith('data:')) {
      sampleImage.url = this.getAbsoluteImageUrl(sampleImage.url);
    }

    return sampleImage;
  }

  /**
   * Get a sanitized image URL that's safe to use in [src] binding
   * Angular blocks data URLs by default for security, so we need to bypass that
   */
  getSafeImageUrl(itemIndex: number): SafeUrl | string | null {
    const sampleImage = this.getSampleImage(itemIndex);
    if (!sampleImage?.url) {
      return null;
    }

    // For data URLs, sanitize them to bypass Angular security
    if (sampleImage.url.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(sampleImage.url);
    }

    // For regular URLs, return as-is
    return sampleImage.url;
  }

  hasSampleImage(itemIndex: number): boolean {
    return this.sampleImages[itemIndex] != null;
  }

  /**
   * Convert relative image URLs to absolute URLs
   * If the URL is already absolute (starts with http/https), return as-is
   * Otherwise, prepend the base URL
   */
  private getAbsoluteImageUrl(url: string): string {
    if (!url) return url;

    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If relative, prepend base URL
    const baseUrl = 'https://dashboard.eye-fi.com';
    // Remove leading slash if present to avoid double slashes
    const cleanUrl = url.startsWith('/') ? url : '/' + url;

    return baseUrl + cleanUrl;
  }

  /**
   * Calculate the next version number for a template
   * Examples: "1.0" -> "1.1", "2.5" -> "2.6", "3.9" -> "3.10"
   */
  private getNextVersion(currentVersion: string | number | null | undefined): string {
    if (!currentVersion) return '1.0';

    // Convert to string if it's a number
    const versionString = String(currentVersion);

    const parts = versionString.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;

    // Increment minor version
    return `${major}.${minor + 1}`;
  }

  /**
   * Get display number for item (e.g., "14" for parent, "14.1" for first child)
   */
  /**
   * Get outline number for display (1, 1.1, 1.1.1, 1.1.1.1)
   * Formats the order_index as proper outline numbering
   */
  getOutlineNumber(itemIndex: number): string {
    const item = this.items.at(itemIndex);
    const orderIndex = item.get('order_index')?.value;
    const level = item.get('level')?.value ?? 0;
    const title = item.get('title')?.value;

    if (!orderIndex) return '1';

    // Convert float to outline format: 1.020301 → "1.2.3.1"
    const parts = orderIndex.toString().split('.');

    if (parts.length === 1) {
      // Whole number: 1, 2, 3
      return parts[0];
    }

    // Has decimal part: 1.020301 → "1.2.3.1"
    const wholePart = parts[0];
    const decimalPart = parts[1] || '';

    // Split decimal into pairs: "020301" → ["02", "03", "01"] → [2, 3, 1]
    const components = [wholePart];
    for (let i = 0; i < decimalPart.length; i += 2) {
      const pair = decimalPart.substring(i, i + 2);
      const num = parseInt(pair, 10);
      components.push(num.toString());
    }

    const result = components.join('.');
    return result;
  }

  openSampleImageUpload(itemIndex: number): void {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];

      if (file && file.type.startsWith('image/')) {
        try {
          await this.uploadSampleImage(itemIndex, file);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      } else {
        alert('Please select an image file (JPG, PNG, GIF, WebP)');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  private async uploadSampleImage(itemIndex: number, file: File): Promise<void> {
    try {
      // Set loading state
      this.uploadingImage = true;

      // Validate file size against template override or default (image)
      const maxSize = this.getMaxUploadBytes('image');
      if (file.size > maxSize) {
        alert('File size too large. Maximum size is ' + Math.round(maxSize / (1024 * 1024)) + 'MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }

      // Create temp ID for upload
      const tempId = `sample_image_${itemIndex}_${Date.now()}`;

      // Upload the image to the server
      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);

      if (response && response.success && response.url) {
        const newImage: SampleImage = {
          id: `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: response.url,
          label: 'Sample Image',
          description: '',
          type: 'photo',
          is_primary: false,
          order_index: 0,
          status: 'loaded'
        };

        // Set the single image for this item
        this.sampleImages[itemIndex] = newImage;

        // Update the form control with the sample image
        const itemFormGroup = this.items.at(itemIndex) as FormGroup;
        if (itemFormGroup) {
          const sampleImageControl = itemFormGroup.get('sample_image_url');
          if (sampleImageControl) {
            sampleImageControl.setValue(newImage.url);
          }
        }

        // Force change detection to update the UI
        this.cdr.detectChanges();

      } else {
        const errorMsg = response?.error || 'Upload failed - no URL returned';
        throw new Error(errorMsg);
      }

    } catch (error: any) {
      console.error('Sample image upload failed:', error);

      // More detailed error handling
      let errorMessage = 'Failed to upload image. Please try again.';

      if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.error('Detailed error:', {
        error: error,
        message: errorMessage,
        stack: error.stack
      });

      alert('Upload Error: ' + errorMessage);
    } finally {
      this.uploadingImage = false;
    }
  }

  /**
   * Convert a data URL (from Word import) to an uploaded file
   * @param itemIndex - The item index in the form array
   * @param dataUrl - The base64 data URL to convert
   */
  private async convertDataUrlToUpload(itemIndex: number, dataUrl: string): Promise<void> {
    try {
      // Convert data URL to Blob
      const blob = this.dataUrlToBlob(dataUrl);

      // Determine file extension from MIME type
      const mimeType = dataUrl.split(';')[0].split(':')[1];
      const extension = mimeType.split('/')[1];
      const filename = `imported-image-${Date.now()}-${itemIndex}.${extension}`;

      // Convert Blob to File
      const file = new File([blob], filename, { type: mimeType });

      // Upload using the existing upload function
      await this.uploadSampleImage(itemIndex, file);
    } catch (error) {
      console.error('Failed to convert/upload data URL:', error);
      throw error;
    }
  }

  /**
   * Convert a data URL string to a Blob object
   * @param dataUrl - The data URL to convert
   * @returns Blob object
   */
  private dataUrlToBlob(dataUrl: string): Blob {
    try {
      // Split the data URL
      const parts = dataUrl.split(',');
      if (parts.length !== 2) {
        throw new Error(`Invalid data URL format - expected 2 parts, got ${parts.length}`);
      }

      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const base64 = parts[1];

      if (!base64 || base64.length < 100) {
        throw new Error(`Data URL base64 part is too short: ${base64?.length} chars`);
      }

      // Decode base64
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], { type: mime });
    } catch (error) {
      console.error('❌ Failed to convert data URL to Blob:', error);
      console.error('Data URL preview:', dataUrl.substring(0, 200));
      throw error;
    }
  }

  previewSampleImage(itemIndex: number): void {
    const primaryImage = this.getPrimarySampleImage(itemIndex);
    if (primaryImage?.url) {
      this.previewImageUrl = primaryImage.url;
      this.modalService.open(this.imagePreviewModalRef, {
        size: 'lg',
        centered: true
      });
    }
  }

  removeSampleImage(itemIndex: number): void {
    // Remove the sample image for this item
    this.sampleImages[itemIndex] = null;

    // Update the form control 
    const itemFormGroup = this.items.at(itemIndex) as FormGroup;
    if (itemFormGroup) {
      const sampleImageControl = itemFormGroup.get('sample_image_url');
      if (sampleImageControl) {
        sampleImageControl.setValue(null);
      }
    }
  }

  onSampleImageError(itemIndex: number): void {
    // Handle image load error
    const sampleImage = this.getSampleImage(itemIndex);
    console.error(`Failed to load image for item ${itemIndex + 1}:`, sampleImage?.url);

    // If this is a data URL, try to upload it
    if (sampleImage?.url?.startsWith('data:')) {
      console.warn('Image is still a data URL - attempting to upload...');
      this.convertDataUrlToUpload(itemIndex, sampleImage.url).catch(err => {
        console.error('Failed to upload image:', err);
      });
    }
  }

  onSampleImageLoad(itemIndex: number): void {
    // Image loaded successfully
  }

  // ============================================
  // Primary Sample Image Methods
  // ============================================

  hasPrimarySampleImage(itemIndex: number): boolean {
    const images = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) {
      return !!images; // Legacy single image
    }
    return images.some(img => img.is_primary && img.image_type === 'sample');
  }

  getPrimarySampleImage(itemIndex: number): SampleImage | null {
    const images = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) {
      return images || null; // Legacy single image
    }
    return images.find(img => img.is_primary && img.image_type === 'sample') || null;
  }

  getPrimarySampleImageUrl(itemIndex: number): SafeUrl | string | null {
    const primaryImage = this.getPrimarySampleImage(itemIndex);
    if (!primaryImage?.url) return null;

    if (primaryImage.url.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(primaryImage.url);
    }
    return this.getAbsoluteImageUrl(primaryImage.url);
  }

  openPrimarySampleImageUpload(itemIndex: number): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          await this.uploadPrimarySampleImage(itemIndex, file);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      } else {
        alert('Please select an image file (JPG, PNG, GIF, WebP)');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async uploadPrimarySampleImage(itemIndex: number, file: File): Promise<void> {
    this.uploadingImage = true;

    try {
      const response = await this.photoUploadService.uploadTemporaryImage(file, `item-${itemIndex}-primary`);

      if (response.success && response.url) {
        const newPrimaryImage: SampleImage = {
          url: response.url,
          label: 'Primary Sample Image',
          description: 'This is what users should replicate',
          type: 'photo',
          image_type: 'sample',
          is_primary: true,
          order_index: 0,
          status: 'loaded'
        };

        // Update sample images array
        let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
        let imageArray: SampleImage[] = [];

        if (!images) {
          imageArray = [];
        } else if (Array.isArray(images)) {
          imageArray = images;
        } else {
          imageArray = [images];
        }

        // Remove old primary sample if exists
        imageArray = imageArray.filter(img => !(img.is_primary && img.image_type === 'sample'));

        // Add new primary sample at the start
        imageArray.unshift(newPrimaryImage);

        this.sampleImages[itemIndex] = imageArray;

        // Update form control
        const item = this.items.at(itemIndex);
        item.patchValue({
          sample_image_url: response.url,
          sample_images: imageArray
        });

        // Mark form as dirty to detect changes
        item.markAsDirty();
        this.templateForm.markAsDirty();
      }
    } catch (error) {
      console.error('Error uploading primary sample image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      this.uploadingImage = false;
    }
  }

  removePrimarySampleImage(itemIndex: number): void {
    let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
    let imageArray: SampleImage[] = [];

    if (!images) {
      this.sampleImages[itemIndex] = null;
      return;
    }

    if (Array.isArray(images)) {
      // Remove primary sample
      imageArray = images.filter(img => !(img.is_primary && img.image_type === 'sample'));
      this.sampleImages[itemIndex] = imageArray.length > 0 ? imageArray : null;
    } else {
      this.sampleImages[itemIndex] = null;
    }

    // Update form
    const item = this.items.at(itemIndex);
    const remainingImages = this.sampleImages[itemIndex];
    item.patchValue({
      sample_image_url: '',
      sample_images: remainingImages
    });
  }

  // ============================================
  // Reference Images Methods
  // ============================================

  getReferenceImages(itemIndex: number): SampleImage[] {
    const images = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) {
      return [];
    }
    // Filter to show only reference images (not primary sample images)
    // Reference images should have is_primary=false AND image_type='reference'
    return images.filter(img => !img.is_primary && img.image_type !== 'sample');
  }

  getReferenceImageCount(itemIndex: number): number {
    return this.getReferenceImages(itemIndex).length;
  }

  getReferenceImageUrl(refImage: SampleImage): SafeUrl | string {
    if (!refImage?.url) return '';
    
    if (refImage.url.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(refImage.url);
    }
    return this.getAbsoluteImageUrl(refImage.url);
  }

  getTotalSampleImagesCount(itemIndex: number): number {
    const primaryCount = this.hasPrimarySampleImage(itemIndex) ? 1 : 0;
    const referenceCount = this.getReferenceImageCount(itemIndex);
    return primaryCount + referenceCount;
  }

  /**
   * Helper method to check if value is an array (for template usage)
   */
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  /**
   * Get sample images as array for preview
   */
  getSampleImagesArray(itemIndex: number): SampleImage[] {
    const images = this.sampleImages[itemIndex];
    if (!images) return [];
    return Array.isArray(images) ? images : [images];
  }

  /**
   * Get sample videos as array for preview
   */
  getSampleVideosArray(itemIndex: number): SampleVideo[] {
    const videos = this.sampleVideos[itemIndex];
    if (!videos) return [];
    return Array.isArray(videos) ? videos : [videos];
  }

  /**
   * Open image in full-screen preview modal
   */
  openImagePreview(imageUrl: string): void {
    this.previewImageUrl = imageUrl;
    this.modalService.open(this.imagePreviewModalRef, { size: 'lg', centered: true });
  }

  previewNavPrimaryImage(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const primary = this.getPrimarySampleImage(itemIndex);
    if (!primary?.url) {
      return;
    }

    const url = primary.url.startsWith('data:') ? primary.url : this.getAbsoluteImageUrl(primary.url);
    this.openImagePreview(url);
  }

  previewNavSampleVideo(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const url = this.getPrimarySampleVideoUrl(itemIndex);
    if (!url) {
      return;
    }

    this.previewVideoUrl = url;
    this.modalService.open(this.videoPreviewModalRef, { size: 'lg', centered: true });
  }

  /**
   * Scroll to specific item in preview modal
   */
  scrollToPreviewItem(itemIndex: number): void {
    const element = document.getElementById(`preview-item-${itemIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add brief highlight effect
      element.classList.add('bg-primary', 'bg-opacity-10');
      setTimeout(() => {
        element.classList.remove('bg-primary', 'bg-opacity-10');
      }, 1500);
    }
  }

  /**
   * Scroll to an item in the edit view (main form)
   */
  scrollToItem(itemIndex: number): void {
    // Set selected item if focused edit mode is ON
    if (this.focusedEditMode) {
      this.selectedFormItemIndex = itemIndex;
    }

    const element = document.getElementById(`edit-item-${itemIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add brief highlight effect
      element.classList.add('border-success', 'border-3');
      const originalBorderClass = element.className;
      setTimeout(() => {
        element.classList.remove('border-success', 'border-3');
      }, 1500);
    }
  }

  /**
   * Scroll to the first invalid field and highlight it
   */
  scrollToFirstInvalidField(): void {
    // Check template-level fields first (name, category, description)
    const templateLevelFields = ['name', 'category', 'description'];
    for (const fieldName of templateLevelFields) {
      const control = this.templateForm.get(fieldName);
      if (control && control.invalid) {
        const element = document.querySelector(`[formControlName="${fieldName}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }

    // Check items for missing sample media requirements
    const missingSampleImageIndex = this.getFirstMissingSampleImageIndex();
    const missingSampleVideoIndex = this.getFirstMissingSampleVideoIndex();
    const missingEitherMediaIndex = this.getFirstMissingEitherMediaIndex();
    const missingSampleIndex =
      missingSampleImageIndex ??
      missingSampleVideoIndex ??
      missingEitherMediaIndex;

    if (missingSampleIndex !== null) {
      this.scrollToItem(missingSampleIndex);
      return;
    }

    // Check items for invalid title/description fields
    const itemsArray = this.items;
    for (let i = 0; i < itemsArray.length; i++) {
      const itemControl = itemsArray.at(i);
      const titleControl = itemControl.get('title');
      if (titleControl && titleControl.invalid) {
        // Scroll to the item
        this.scrollToItem(i);
        return;
      }
      const descriptionControl = itemControl.get('description');
      if (descriptionControl && descriptionControl.invalid) {
        this.scrollToItem(i);
        return;
      }
    }
  }

  private getFirstMissingSampleImageIndex(): number | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const submissionType = item.get('submission_type')?.value;
      const pictureRequired = item.get('photo_requirements')?.value?.picture_required;

      if (
        submissionType === 'photo' &&
        pictureRequired &&
        !this.hasPrimarySampleImage(i) &&
        this.getReferenceImageCount(i) === 0
      ) {
        return i;
      }
    }
    return null;
  }

  private getFirstMissingSampleVideoIndex(): number | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const submissionType = item.get('submission_type')?.value;

      if (submissionType === 'video' && !this.hasSampleVideo(i)) {
        return i;
      }
    }
    return null;
  }

  private getFirstMissingEitherMediaIndex(): number | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const submissionType = item.get('submission_type')?.value;

      if (
        submissionType === 'either' &&
        !this.hasSampleVideo(i) &&
        !this.hasPrimarySampleImage(i) &&
        this.getReferenceImageCount(i) === 0
      ) {
        return i;
      }
    }
    return null;
  }

  /**
   * Check if a form item should be visible based on view mode and selection
   */
  isFormItemVisible(itemIndex: number): boolean {
    const item = this.items.at(itemIndex);
    if (!item) return false;

    // If focused edit mode is OFF, show all items (just scroll to selected)
    if (!this.focusedEditMode) {
      const level = item.get('level')?.value || 0;

      // Only apply view mode filter
      if (this.navViewMode === 'groups' && level !== 0) {
        return false; // Only show groups (level 0)
      }
      if (this.navViewMode === 'items' && level === 0) {
        return false; // Only show items (level > 0)
      }

      return true; // Show all in 'all' mode
    }

    // Focused edit mode is ON - show only selected item and its descendants
    // If a specific item is selected, show it plus all its descendants
    if (this.selectedFormItemIndex !== null) {
      // Show the selected item itself
      if (itemIndex === this.selectedFormItemIndex) return true;

      // Show if this item is a descendant of the selected item
      return this.isDescendantOf(itemIndex, this.selectedFormItemIndex);
    }

    const level = item.get('level')?.value || 0;

    // Apply view mode filter
    if (this.navViewMode === 'groups' && level !== 0) {
      return false; // Only show groups (level 0)
    }
    if (this.navViewMode === 'items' && level === 0) {
      return false; // Only show items (level > 0)
    }

    return true; // Show all in 'all' mode
  }

  isNavItemInvalid(itemIndex: number): boolean {
    const item = this.items.at(itemIndex) as FormGroup | undefined;
    if (!item) return false;

    const touched = item.touched || this.templateForm.touched;
    const invalidControls = item.invalid;
    const isActive = !!item.get('is_required')?.value;

    const submissionType = item.get('submission_type')?.value;
    const requiresPhoto = submissionType === 'photo';
    const requiresVideo = submissionType === 'video';
    const allowsEither = submissionType === 'either';

    const missingSampleImage = (requiresPhoto || allowsEither)
      && item.get('photo_requirements')?.value?.picture_required
      && !this.hasPrimarySampleImage(itemIndex)
      && this.getReferenceImageCount(itemIndex) === 0;

    const missingSampleVideo = (requiresVideo || allowsEither)
      && !this.hasSampleVideo(itemIndex)
      && (!allowsEither || (!this.hasPrimarySampleImage(itemIndex) && this.getReferenceImageCount(itemIndex) === 0));

    const missingSample = missingSampleImage || missingSampleVideo;

    if (isActive) {
      return invalidControls || missingSample;
    }

    return touched && (invalidControls || missingSample);
  }

  /**
   * Clear filters and show all form items
   */
  showAllFormItems(): void {
    this.selectedFormItemIndex = null;
    this.navViewMode = 'all';
    this.cdr.detectChanges();
  }

  /**
   * Check if an item is a descendant (child at any level) of a parent item
   */
  private isDescendantOf(itemIndex: number, parentIndex: number): boolean {
    if (itemIndex <= parentIndex) return false;

    const parentLevel = this.items.at(parentIndex)?.get('level')?.value || 0;
    const itemLevel = this.items.at(itemIndex)?.get('level')?.value || 0;

    // Item must have a deeper level to be a descendant
    if (itemLevel <= parentLevel) return false;

    // Check if this item is within the parent's range
    // Start from the item and walk backwards to find if parent is an ancestor
    for (let i = itemIndex - 1; i > parentIndex; i--) {
      const checkLevel = this.items.at(i)?.get('level')?.value || 0;
      // If we hit an item at the same or shallower level as parent, we've left the parent's tree
      if (checkLevel <= parentLevel) return false;
    }

    return true;
  }

  /**
   * Edit only the selected item from navigation dropdown
   */
  editItemOnly(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFormItemIndex = itemIndex;
    this.scrollToItem(itemIndex);
  }

  /**
   * Get count of required items
   */
  getRequiredItemsCount(): number {
    return this.items.controls.filter(item => item.get('is_required')?.value).length;
  }

  /**
   * Get count of photo items
   */
  getPhotoItemsCount(): number {
    return this.items.controls.filter(item =>
      item.get('submission_type')?.value === 'photo' ||
      item.get('submission_type')?.value === 'either'
    ).length;
  }

  /**
   * Get count of video items
   */
  getVideoItemsCount(): number {
    return this.items.controls.filter(item =>
      item.get('submission_type')?.value === 'video' ||
      item.get('submission_type')?.value === 'either'
    ).length;
  }

  /**
   * Get count of items with sample media
   */
  getItemsWithMediaCount(): number {
    let count = 0;
    this.items.controls.forEach((item, i) => {
      const hasImages = this.getSampleImagesArray(i).length > 0;
      const hasVideos = this.getSampleVideosArray(i).length > 0;
      if (hasImages || hasVideos) count++;
    });
    return count;
  }

  /**
   * Toggle expansion state of a parent item in navigation
   */
  toggleNavExpansion(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent scrollToItem from firing
    }

    if (this.expandedItems.has(itemIndex)) {
      this.expandedItems.delete(itemIndex);
    } else {
      this.expandedItems.add(itemIndex);
    }
  }

  /**
   * Check if an item should be visible in the navigation tree
   */
  isNavItemVisible(itemIndex: number): boolean {
    const item = this.items.at(itemIndex);
    if (!item) return false;

    const level = item.get('level')?.value || 0;

    // Apply view mode filter first
    if (this.navViewMode === 'groups' && level !== 0) {
      // In groups mode, only show level 0 items (groups/parents)
      return false;
    }
    if (this.navViewMode === 'items' && level === 0) {
      // In items mode, only show non-group items (level > 0)
      return false;
    }

    // Then apply search filter if active
    if (this.isNavSearchActive()) {
      return this.navSearchVisibleIndices.has(itemIndex);
    }

    // Root items are always visible (if not filtered by view mode)
    if (level === 0) return true;

    // Find parent item and check if it's expanded
    for (let i = itemIndex - 1; i >= 0; i--) {
      const potentialParent = this.items.at(i);
      const parentLevel = potentialParent?.get('level')?.value || 0;

      // Found the direct parent
      if (parentLevel === level - 1) {
        return this.expandedItems.has(i) && this.isNavItemVisible(i);
      }
    }

    return false;
  }

  isNavSearchActive(): boolean {
    return this.normalizeNavSearchTerm(this.navSearchTerm).length > 0;
  }

  isNavItemMatch(itemIndex: number): boolean {
    return this.isNavSearchActive() && this.navSearchMatchedIndices.has(itemIndex);
  }

  onNavSearchTermChanged(): void {
    const normalized = this.normalizeNavSearchTerm(this.navSearchTerm);

    // Search started
    if (!this.lastNormalizedSearchTerm && normalized) {
      this.savedExpandedItemsBeforeSearch = new Set(this.expandedItems);
    }

    // Search cleared
    if (this.lastNormalizedSearchTerm && !normalized) {
      if (this.savedExpandedItemsBeforeSearch) {
        this.expandedItems = new Set(this.savedExpandedItemsBeforeSearch);
      }
      this.savedExpandedItemsBeforeSearch = null;
    }

    this.lastNormalizedSearchTerm = normalized;
    this.updateNavSearchSets();

    // Auto-expand parents of matches for context
    if (normalized) {
      this.navSearchMatchedIndices.forEach((i) => this.expandParentsOfItem(i));
    }

    this.cdr.detectChanges();
  }

  clearNavSearch(): void {
    this.navSearchTerm = '';
    this.onNavSearchTermChanged();
  }

  /**
   * Set the navigation view mode
   */
  setNavViewMode(mode: 'all' | 'groups' | 'items'): void {
    this.navViewMode = mode;
    this.selectedFormItemIndex = null; // Clear item selection when changing view mode

    // Auto-expand based on mode
    if (mode === 'groups') {
      // Expand all groups to show their children
      this.expandAllNav();
    }

    this.cdr.detectChanges();
  }

  private normalizeNavSearchTerm(term: string): string {
    return (term || '').trim().toLowerCase();
  }

  private updateNavSearchSets(): void {
    const normalized = this.normalizeNavSearchTerm(this.navSearchTerm);

    this.navSearchMatchedIndices.clear();
    this.navSearchVisibleIndices.clear();
    this.navSearchMatchCount = 0;

    if (!normalized) {
      return;
    }

    // Find matches
    this.items.controls.forEach((ctrl, i) => {
      const title = ((ctrl.get('title')?.value ?? '') + '').toLowerCase();
      const desc = ((ctrl.get('description')?.value ?? '') + '').toLowerCase();
      if (title.includes(normalized) || desc.includes(normalized)) {
        this.navSearchMatchedIndices.add(i);
      }
    });

    this.navSearchMatchCount = this.navSearchMatchedIndices.size;

    // Visible = matches + ancestors + descendants of a match
    this.navSearchMatchedIndices.forEach((matchIndex) => {
      this.navSearchVisibleIndices.add(matchIndex);
      this.addNavAncestors(matchIndex);
      this.addNavDescendants(matchIndex);
    });
  }

  private addNavAncestors(itemIndex: number): void {
    let currentLevel = this.items.at(itemIndex)?.get('level')?.value || 0;
    for (let i = itemIndex - 1; i >= 0 && currentLevel > 0; i--) {
      const level = this.items.at(i)?.get('level')?.value || 0;
      if (level === currentLevel - 1) {
        this.navSearchVisibleIndices.add(i);
        currentLevel = level;
      }
    }
  }

  private addNavDescendants(itemIndex: number): void {
    const level = this.items.at(itemIndex)?.get('level')?.value || 0;
    for (let i = itemIndex + 1; i < this.items.length; i++) {
      const nextLevel = this.items.at(i)?.get('level')?.value || 0;
      if (nextLevel <= level) break;
      this.navSearchVisibleIndices.add(i);
    }
  }

  /**
   * Check if item has children (is a parent)
   */
  hasChildren(itemIndex: number): boolean {
    const currentLevel = this.items.at(itemIndex)?.get('level')?.value || 0;

    // Check if the next item has a higher level (is a child)
    if (itemIndex + 1 < this.items.length) {
      const nextLevel = this.items.at(itemIndex + 1)?.get('level')?.value || 0;
      return nextLevel > currentLevel;
    }

    return false;
  }

  /**
   * Initialize navigation tree - expand all parent items by default
   */
  initializeNavExpansion(): void {
    this.items.controls.forEach((item, i) => {
      if (this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  /**
   * Expand all parent items in navigation
   */
  expandAllNav(): void {
    this.items.controls.forEach((item, i) => {
      if (this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  /**
   * Collapse all parent items in navigation
   */
  collapseAllNav(): void {
    this.expandedItems.clear();
  }

  /**
   * Setup scroll listener to track which item is currently in view
   */
  setupScrollListener(): void {
    if (this.boundScrollHandler) {
      return;
    }

    this.boundScrollHandler = () => {
      if (this.scheduledFallbackCheck) return;
      this.scheduledFallbackCheck = true;
      requestAnimationFrame(() => {
        this.scheduledFallbackCheck = false;
        this.checkActiveItem();
      });
    };

    window.addEventListener('scroll', this.boundScrollHandler, { passive: true });
  }

  private teardownScrollListener(): void {
    if (this.boundScrollHandler) {
      window.removeEventListener('scroll', this.boundScrollHandler);
      this.boundScrollHandler = null;
    }
  }

  private setupIntersectionObserver(): void {
    this.teardownIntersectionObserver();

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.setupScrollListener();
      return;
    }

    this.visibleItemEntries.clear();

    this.activeItemObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const match = /^edit-item-(\d+)$/.exec(el.id || '');
          if (!match) continue;
          const index = parseInt(match[1], 10);

          if (entry.isIntersecting) {
            this.visibleItemEntries.set(index, entry);
          } else {
            this.visibleItemEntries.delete(index);
          }
        }

        const nextActive = this.pickBestActiveIndexFromVisibleEntries();
        if (nextActive !== -1 && nextActive !== this.activeNavItemIndex) {
          this.activeNavItemIndex = nextActive;
          this.updateStickyParentFromActive(nextActive);
          this.expandParentsOfItem(nextActive);
          this.scrollNavToActiveItem(nextActive);
          this.cdr.detectChanges();
        }
      },
      {
        root: null,
        // Bias toward whichever item is near the top of the viewport
        rootMargin: '-120px 0px -65% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
      }
    );

    // Observe all rendered edit-item elements
    for (let i = 0; i < this.items.length; i++) {
      const el = document.getElementById(`edit-item-${i}`);
      if (el) {
        this.activeItemObserver.observe(el);
      }
    }
  }

  private teardownIntersectionObserver(): void {
    if (this.activeItemObserver) {
      this.activeItemObserver.disconnect();
      this.activeItemObserver = null;
    }
    this.visibleItemEntries.clear();
  }

  private pickBestActiveIndexFromVisibleEntries(): number {
    if (this.visibleItemEntries.size === 0) return -1;

    const targetTop = 120;
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (const [index, entry] of this.visibleItemEntries.entries()) {
      const distance = Math.abs(entry.boundingClientRect.top - targetTop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  private updateStickyParentFromActive(activeIndex: number): void {
    this.stickyParentIndex = this.computeStickyParentIndex(activeIndex);
  }

  private computeStickyParentIndex(activeIndex: number): number | null {
    if (activeIndex < 0 || activeIndex >= this.items.length) {
      return null;
    }

    const activeLevel = this.items.at(activeIndex)?.get('level')?.value ?? 0;
    if (!activeLevel || activeLevel <= 0) {
      return null;
    }

    // Find the nearest root (level 0) ancestor above this item
    for (let i = activeIndex - 1; i >= 0; i--) {
      const level = this.items.at(i)?.get('level')?.value ?? 0;
      if (level === 0) {
        return this.hasChildren(i) ? i : null;
      }
    }

    return null;
  }

  getItemTitle(index: number): string {
    const value = this.items.at(index)?.get('title')?.value;
    return (value ?? '').toString() || 'Untitled';
  }

  getChildCount(parentIndex: number): number {
    if (parentIndex < 0 || parentIndex >= this.items.length) return 0;
    const parentLevel = this.items.at(parentIndex)?.get('level')?.value ?? 0;
    if (parentLevel !== 0) return 0;

    let count = 0;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const level = this.items.at(i)?.get('level')?.value ?? 0;
      if (level <= parentLevel) break;
      count++;
    }
    return count;
  }

  refreshActiveItemTracking(): void {
    // Ensure we don't have both observer and scroll listener running
    this.teardownScrollListener();
    this.setupIntersectionObserver();
  }

  /**
   * Check which item is currently in the viewport
   */
  checkActiveItem(): void {
    const viewportMiddle = window.innerHeight / 2;
    let closestItem = -1;
    let closestDistance = Infinity;

    // Find the item closest to the middle of the viewport
    this.items.controls.forEach((item, i) => {
      const element = document.getElementById(`edit-item-${i}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(elementMiddle - viewportMiddle);

        if (distance < closestDistance && rect.top < viewportMiddle && rect.bottom > 0) {
          closestDistance = distance;
          closestItem = i;
        }
      }
    });

    if (closestItem !== this.activeNavItemIndex) {
      this.activeNavItemIndex = closestItem;
      this.updateStickyParentFromActive(closestItem);

      // Auto-expand parent folders to show active item
      if (closestItem >= 0) {
        this.expandParentsOfItem(closestItem);
        // Scroll navigation to show the active item
        this.scrollNavToActiveItem(closestItem);
      }

      this.cdr.detectChanges();
    }
  }

  /**
   * Scroll the navigation sidebar to show the active item
   */
  scrollNavToActiveItem(itemIndex: number): void {
    // Wait for DOM to update after expansion
    setTimeout(() => {
      const navElement = document.getElementById(`nav-item-${itemIndex}`);
      const navContainer = document.querySelector('.list-group-flush');

      if (navElement && navContainer) {
        const containerRect = navContainer.getBoundingClientRect();
        const elementRect = navElement.getBoundingClientRect();

        // Check if element is outside the visible area of the container
        const isAboveView = elementRect.top < containerRect.top;
        const isBelowView = elementRect.bottom > containerRect.bottom;

        if (isAboveView || isBelowView) {
          // Scroll the navigation container to center the active item
          const scrollTop = navElement.offsetTop - navContainer.clientHeight / 2 + navElement.clientHeight / 2;
          navContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }, 150); // Delay to allow expansion animation
  }

  /**
   * Expand all parent folders of a given item
   */
  expandParentsOfItem(itemIndex: number): void {
    const level = this.items.at(itemIndex)?.get('level')?.value || 0;

    if (level === 0) return; // Root item, no parents

    // Find all parent items going backward
    for (let i = itemIndex - 1; i >= 0; i--) {
      const parentLevel = this.items.at(i)?.get('level')?.value || 0;

      // If this is a parent level, expand it
      if (parentLevel < level && this.hasChildren(i)) {
        this.expandedItems.add(i);
      }

      // Stop when we reach a root item
      if (parentLevel === 0) break;
    }
  }

  ngOnDestroy(): void {
    this.teardownIntersectionObserver();
    this.teardownScrollListener();

    if (this.scrollCheckTimeout) {
      clearTimeout(this.scrollCheckTimeout);
    }

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  openSampleImagesModal(itemIndex: number): void {
    // Store the current item index for the modal
    this.currentModalItemIndex = itemIndex;

    // Open modal - the modal content will use openPrimarySampleImageUpload and openReferenceImageUpload
    this.modalService.open(this.sampleImagesModalTemplate, { size: 'lg', backdrop: 'static' });
  }

  openSampleVideoModal(itemIndex: number): void {
    // Store the current item index for the modal
    this.currentModalItemIndex = itemIndex;

    // Open modal - the modal content will use openSampleVideoUpload
    this.modalService.open(this.sampleVideoModalTemplate, { size: 'lg', backdrop: 'static' });
  }

  openReferenceImageUpload(itemIndex: number): void {
    if (this.getReferenceImageCount(itemIndex) >= 5) {
      alert('Maximum of 5 reference images allowed');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          await this.uploadReferenceImage(itemIndex, file);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      } else {
        alert('Please select an image file');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async uploadReferenceImage(itemIndex: number, file: File): Promise<void> {
    if (this.getReferenceImageCount(itemIndex) >= 5) {
      alert('Maximum of 5 reference images allowed');
      return;
    }

    this.uploadingImage = true;

    try {
      const response = await this.photoUploadService.uploadTemporaryImage(file, `item-${itemIndex}-ref-${Date.now()}`);

      if (response.success && response.url) {
        const newReferenceImage: SampleImage = {
          url: response.url,
          label: `Reference ${this.getReferenceImageCount(itemIndex) + 1}`,
          description: '',
          type: 'photo',
          image_type: 'reference',
          is_primary: false,
          order_index: this.getReferenceImageCount(itemIndex) + 1,
          status: 'loaded'
        };

        // Update sample images array
        let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
        let imageArray: SampleImage[] = [];

        if (!images) {
          imageArray = [];
        } else if (Array.isArray(images)) {
          imageArray = images;
        } else {
          // Legacy single image - ensure it's marked as primary sample before converting to array
          const legacyImage = images;
          legacyImage.is_primary = true;
          legacyImage.image_type = 'sample';
          imageArray = [legacyImage];
        }

        imageArray.push(newReferenceImage);
        this.sampleImages[itemIndex] = imageArray;

        // Update form control
        const item = this.items.at(itemIndex);
        item.patchValue({
          sample_images: imageArray
        });

        // Mark form as dirty to detect changes
        item.markAsDirty();
        this.templateForm.markAsDirty();
      }
    } catch (error) {
      console.error('Error uploading reference image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      this.uploadingImage = false;
    }
  }

  removeReferenceImage(itemIndex: number, refImageIndex: number): void {
    let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) return;

    const refImages = this.getReferenceImages(itemIndex);
    const imageToRemove = refImages[refImageIndex];

    // Remove the specific reference image
    const filteredImages: SampleImage[] = images.filter((img: SampleImage) => img !== imageToRemove);

    this.sampleImages[itemIndex] = filteredImages.length > 0 ? filteredImages : null;

    // Update form
    const item = this.items.at(itemIndex);
    item.patchValue({
      sample_images: this.sampleImages[itemIndex]
    });

    // Mark form as dirty to detect changes
    item.markAsDirty();
    this.templateForm.markAsDirty();
  }

  previewReferenceImage(itemIndex: number, refImageIndex: number): void {
    const refImages = this.getReferenceImages(itemIndex);
    const image = refImages[refImageIndex];
    if (image?.url) {
      this.previewImageUrl = image.url;
      this.modalService.open(this.imagePreviewModalRef, {
        size: 'lg',
        centered: true
      });
    }
  }

  // =====================
  // Sample Video Methods
  // =====================

  openSampleVideoUpload(itemIndex: number): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('video/')) {
        try {
          await this.uploadSampleVideo(itemIndex, file);
        } catch (error) {
          console.error('Video upload failed:', error);
        }
      } else {
        alert('Please select a video file (mp4, webm, mov)');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async uploadSampleVideo(itemIndex: number, file: File): Promise<void> {
    this.uploadingVideo = true;

    try {
      // Validate allowed duration vs item config
      const item = this.items.at(itemIndex);
      const maxDuration = item?.get('photo_requirements')?.get('max_video_duration_seconds')?.value || 30;

      // Check duration by loading metadata
      const url = URL.createObjectURL(file);
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = url;

      const duration: number = await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(videoEl.duration || 0);
        };
        videoEl.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to read video metadata'));
        };
      });

      if (maxDuration && duration > maxDuration) {
        alert(`Video duration is ${Math.round(duration)}s which exceeds the allowed ${maxDuration}s`);
        return;
      }

      const tempId = `sample_video_${itemIndex}_${Date.now()}`;
      // Validate file size against template override or default (video)
      const maxSize = this.getMaxUploadBytes('video');
      // if (file.size > maxSize) {
      //   alert('Video file size too large. Maximum size is ' + Math.round(maxSize / (1024 * 1024)) + 'MB');
      //   return;
      // }

      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);

      if (response && response.success && response.url) {
        const newVideo: SampleVideo = {
          id: `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: response.url,
          label: 'Sample Video',
          description: '',
          type: 'video',
          is_primary: true,
          order_index: 0,
          status: 'loaded'
        };

        this.sampleVideos[itemIndex] = newVideo;

        // Update the form control
        const itemFormGroup = this.items.at(itemIndex) as FormGroup;
        if (itemFormGroup) {
          itemFormGroup.patchValue({
            sample_videos: [newVideo]
          });
        }
      } else {
        const err = response?.error || 'Upload failed';
        throw new Error(err);
      }
    } catch (error: any) {
      console.error('Sample video upload error:', error);
      alert('Failed to upload video: ' + (error?.message || error));
    } finally {
      this.uploadingVideo = false;
    }
  }

  previewSampleVideo(itemIndex: number): void {
    const video = this.sampleVideos[itemIndex];
    let url: string | null = null;
    if (Array.isArray(video)) {
      url = video[0]?.url || null;
    } else if (video) {
      url = video.url;
    }

    if (url) {
      this.previewVideoUrl = url;
      this.modalService.open(this.videoPreviewModalRef, { size: 'lg', centered: true });
    }
  }

  hasSampleVideo(itemIndex: number): boolean {
    const v = this.sampleVideos[itemIndex];
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v.url;
  }

  getPrimarySampleVideo(itemIndex: number): SampleVideo | null {
    const v = this.sampleVideos[itemIndex];
    if (!v) return null;
    if (Array.isArray(v)) return v.find(x => x.is_primary) || v[0] || null;
    return v as SampleVideo;
  }

  getPrimarySampleVideoUrl(itemIndex: number): string | null {
    const primary = this.getPrimarySampleVideo(itemIndex);
    if (!primary?.url) return null;
    if (primary.url.startsWith('data:')) {
      return primary.url;
    }
    return this.getAbsoluteImageUrl(primary.url);
  }

  removeSampleVideo(itemIndex: number): void {
    this.sampleVideos[itemIndex] = null;
    const item = this.items.at(itemIndex);
    if (item) {
      item.patchValue({ sample_videos: null });
      item.markAsDirty();
      this.templateForm.markAsDirty();
    }
  }

  saveTemplate(): void {
    const missingSampleImageIndex = this.getFirstMissingSampleImageIndex();
    const missingSampleVideoIndex = this.getFirstMissingSampleVideoIndex();
    const missingEitherMediaIndex = this.getFirstMissingEitherMediaIndex();

    const missingSampleIndex =
      missingSampleImageIndex ??
      missingSampleVideoIndex ??
      missingEitherMediaIndex;

    if (this.templateForm.invalid || missingSampleIndex !== null) {
      this.templateForm.markAllAsTouched();
      // Mark all items as touched too
      this.items.controls.forEach(item => {
        item.markAllAsTouched();
      });

      if (missingSampleIndex !== null) {
        this.scrollToItem(missingSampleIndex);
      } else {
        this.scrollToFirstInvalidField();
      }
      return;
    }

    this.saving = true;

    const templateData = this.templateForm.value;

    // DEBUG: Log sample_images from form before save
    //
    console.log('� Checking form data before save:');
    templateData.items.forEach((item: any, index: number) => {
      if (item.sample_images && Array.isArray(item.sample_images)) {
        console.log(`  Item ${index}: ${item.sample_images.length} images in form`, item.sample_images.map((img: any) => ({
          label: img.label,
          image_type: img.image_type,
          is_primary: img.is_primary
        })));
      } else {
        console.log(`  Item ${index}: NO sample_images array in form (${typeof item.sample_images})`);
      }
    });

    // Ensure is_active is a proper boolean (convert from checkbox value if needed)
    if (typeof templateData.is_active !== 'boolean') {
      templateData.is_active = !!templateData.is_active;
    }

    // Note: Quality document relationship is handled separately from template creation
    // Remove the form control field since it's not part of the database schema
    delete templateData.quality_document_id;

    // Clean up sample_images array for backend
    templateData.items = templateData.items.map((item: any, index: number) => {
      // Ensure photo_requirements is properly formatted (includes submission_type, etc.)
      if (item.photo_requirements) {
        // Ensure submission_type is present
        if (!item.photo_requirements.submission_type) {
          item.photo_requirements.submission_type = 'photo'; // Default to 'photo'
        }
      }

      // Backend ONE-PASS algorithm automatically determines parent_id from:
      // 1. Sequential order of items in the array
      // 2. The 'level' field
      // No need to send parent_order_index or parent_id - backend calculates it!

      // Ensure sample_images array is properly formatted for the backend
      if (item.sample_images && Array.isArray(item.sample_images)) {
        // Clean up UI-specific fields that shouldn't be sent to backend
        item.sample_images = item.sample_images.map((img: SampleImage) => ({
          url: img.url,
          label: img.label || '',
          description: img.description || '',
          type: img.type || 'photo',
          image_type: img.image_type || 'sample',
          is_primary: img.is_primary || false,
          order_index: img.order_index || 0
        }));
      }
      // Ensure sample_videos array is properly formatted for the backend
      if (item.sample_videos && Array.isArray(item.sample_videos)) {
        item.sample_videos = item.sample_videos.map((v: SampleVideo) => ({
          url: v.url,
          label: v.label || '',
          description: v.description || '',
          type: v.type || 'video',
          is_primary: v.is_primary || false,
          order_index: v.order_index || 0,
          duration_seconds: v.duration_seconds || null
        }));
      }

      if (item.links && Array.isArray(item.links)) {
        item.links = item.links
          .map((link: ItemLink) => ({
            title: (link.title || '').trim(),
            url: (link.url || '').trim(),
            description: (link.description || '').trim()
          }))
          .filter((link: ItemLink) => link.title || link.url || link.description);
      } else {
        item.links = [];
      }

      // Return item with level for ONE-PASS parent_id calculation
      // Backend uses sequential processing + level to determine parent_id automatically
      return {
        ...item
        // parent_order_index removed - no longer needed with ONE-PASS algorithm
      };
    });

    // When editing a template, ask user to describe changes
    if (this.editingTemplate) {
      this.saving = false; // Reset while we show the dialog

      // Show the revision description dialog
      const modalRef = this.modalService.open(RevisionDescriptionDialogComponent, {
        size: 'lg',
        backdrop: 'static',
        keyboard: false
      });

      // Pass data to the modal
      modalRef.componentInstance.templateName = this.editingTemplate.name;
      modalRef.componentInstance.currentVersion = this.editingTemplate.version || '1.0';
      modalRef.componentInstance.nextVersion = this.getNextVersion(this.editingTemplate.version || '1.0');
      // Auto-fill disabled for now

      modalRef.result.then(
        (result) => {
          // Create new version with user's description
          this.proceedWithSave(templateData, true, null, result.revisionDescription, result.notes, result.nextVersion);
        },
        (reason) => {
          // Modal dismissed (cancel)
        }
      );
    } else {
      // New template - no revision needed
      this.proceedWithSave(templateData, false);
    }
  }

  private detectTemplateChanges(originalTemplate: any, newData: any): any {
    const changes: any = {
      has_changes: false,
      field_changes: [],
      items_added: [],
      items_removed: [],
      items_modified: []
    };

    // Compare metadata fields
    const fieldsToCheck = [
      { key: 'name', label: 'Template Name' },
      { key: 'description', label: 'Description' },
      { key: 'part_number', label: 'Part Number' },
      { key: 'product_type', label: 'Product Type' },
      { key: 'category', label: 'Category' },
      { key: 'is_active', label: 'Active Status' },
      { key: 'max_upload_size_mb', label: 'Max Upload Size' },
      { key: 'disable_max_upload_limit', label: 'Disable Upload Limit' }
    ];

    for (const field of fieldsToCheck) {
      const oldValue = originalTemplate[field.key];
      const newValue = newData[field.key];

      const normalizedOld = this.normalizeTemplateFieldValue(field.key, oldValue);
      const normalizedNew = this.normalizeTemplateFieldValue(field.key, newValue);

      if (normalizedOld !== normalizedNew) {
        changes.has_changes = true;
        changes.field_changes.push({
          field: field.label,
          old_value: normalizedOld,
          new_value: normalizedNew
        });
      }
    }

    // Compare items using a SIMPLE approach:
    // 1. Items from DB have 'id' - use that as the key
    // 2. Match old and new by ID
    // 3. If old item's ID not found in new items = REMOVED
    // 4. Compare only items with matching IDs for changes
    const oldItemsRaw = originalTemplate.items || [];
    const oldItems = Array.isArray(oldItemsRaw) && oldItemsRaw.some((item: any) => Array.isArray(item?.children) && item.children.length > 0)
      ? this.flattenNestedItems(oldItemsRaw)
      : oldItemsRaw;
    const newItems = newData.items || [];

    // Build a map of NEW items by their ID (from form's hidden id field)
    const newItemsById = new Map<number, any>();
    const newItemsWithoutId: any[] = [];
    newItems.forEach((item: any) => {
      if (item.id) {
        newItemsById.set(item.id, item);
      } else {
        newItemsWithoutId.push(item);
      }
    });

    // Check each OLD item
    oldItems.forEach((oldItem: any) => {
      if (!oldItem.id) {
        return; // Skip items without IDs
      }

      const newItem = newItemsById.get(oldItem.id);

      if (!newItem) {
        // Old item not found in new items = DELETED
        changes.has_changes = true;
        changes.items_removed.push({
          title: oldItem.title,
          order_index: oldItem.order_index
        });
      } else {
        // Item exists in both - check for modifications
        const itemChanges = this.compareItems(oldItem, newItem);
        if (itemChanges.length > 0) {
          changes.has_changes = true;
          changes.items_modified.push({
            title: newItem.title,
            order_index: newItem.order_index,
            changes: itemChanges
          });
        }

        // Remove from map so we can detect additions later
        newItemsById.delete(oldItem.id);
      }
    });

    // Any items left in newItemsById are NEW
    const addedItems: any[] = [];
    newItemsById.forEach((newItem) => addedItems.push(newItem));
    if (newItemsWithoutId.length > 0) {
      addedItems.push(...newItemsWithoutId);
    }

    if (addedItems.length > 0) {
      changes.has_changes = true;
      addedItems.forEach((newItem) => {
        changes.items_added.push({
          title: newItem.title,
          order_index: newItem.order_index
        });
      });
    }

    return changes;
  }

  private generateItemKey(item: any): string {
    // Use title + order_index as unique key
    return `${item.title}_${item.order_index}`;
  }

  private buildRevisionSummary(changes: any): string {
    if (!changes?.has_changes) {
      return '';
    }

    const lines: string[] = [];

    if (changes.field_changes?.length) {
      const fields = changes.field_changes.map((c: any) => c.field).join(', ');
      lines.push(`Template fields updated: ${fields}`);
    }

    if (changes.items_added?.length) {
      const titles = changes.items_added.map((i: any) => i.title || 'Untitled').join(', ');
      lines.push(`Items added: ${titles}`);
    }

    if (changes.items_removed?.length) {
      const titles = changes.items_removed.map((i: any) => i.title || 'Untitled').join(', ');
      lines.push(`Items removed: ${titles}`);
    }

    if (changes.items_modified?.length) {
      const combined = new Map<string, Set<string>>();
      changes.items_modified.forEach((item: any) => {
        const key = `${item.title || 'Untitled'}|${item.order_index ?? ''}`;
        const fields = (item.changes || []).map((c: any) => c.field).filter(Boolean);
        if (!combined.has(key)) {
          combined.set(key, new Set<string>());
        }
        const set = combined.get(key)!;
        fields.forEach((f: string) => set.add(f));
      });

      combined.forEach((fields, key) => {
        const [title, orderIndex] = key.split('|');
        const fieldList = Array.from(fields).join(', ');
        if (fieldList) {
          const suffix = orderIndex ? ` (#${orderIndex})` : '';
          lines.push(`Item "${title}"${suffix}: ${fieldList}`);
        }
      });
    }

    return lines.join('\n');
  }

  private compareItems(oldItem: any, newItem: any): any[] {
    const itemChanges = [];
    // Compare fields that represent content or order changes
    const fieldsToCheck = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'is_required', label: 'Active' },
      { key: 'sample_image_url', label: 'Sample Image' },
      { key: 'sample_images', label: 'Sample & Reference Images' }, // Track all images (primary + references)
      { key: 'sample_videos', label: 'Sample Videos' },
      { key: 'links', label: 'Links' },
      { key: 'photo_requirements', label: 'Photo Requirements' },
      { key: 'submission_type', label: 'Submission Type' },
      { key: 'submission_time_seconds', label: 'Submission Time Limit' },
      { key: 'order_index', label: 'Position' },        // Track reordering
      { key: 'level', label: 'Hierarchy Level' },       // Track parent/child changes
      { key: 'parent_id', label: 'Parent Item' }        // Track hierarchy changes
    ];

    for (const field of fieldsToCheck) {
      const oldValue = oldItem[field.key];
      const newValue = newItem[field.key];

      // Skip if both are empty
      if (this.isEmptyValue(oldValue) && this.isEmptyValue(newValue)) {
        continue;
      }

      // Special handling for sample_images array - normalize before comparing
      if (field.key === 'sample_images') {
        const normalizedOld = this.normalizeSampleImages(oldValue);
        const normalizedNew = this.normalizeSampleImages(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      } else if (field.key === 'sample_videos') {
        const normalizedOld = this.normalizeSampleVideos(oldValue);
        const normalizedNew = this.normalizeSampleVideos(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      } else if (field.key === 'links') {
        const normalizedOld = this.normalizeLinks(oldValue);
        const normalizedNew = this.normalizeLinks(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      } else if (field.key === 'photo_requirements') {
        const normalizedOld = this.normalizePhotoRequirements(oldValue);
        const normalizedNew = this.normalizePhotoRequirements(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      }
      // For objects (like photo_requirements), use normalized comparison
      else if (typeof oldValue === 'object' && oldValue !== null && typeof newValue === 'object' && newValue !== null) {
        const oldJson = this.sortedStringify(this.normalizeValue(oldValue));
        const newJson = this.sortedStringify(this.normalizeValue(newValue));

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: oldValue,
            new_value: newValue
          });
        }
      }
      // For primitives (strings, numbers, booleans)
      else if (typeof oldValue === 'number' || typeof newValue === 'number') {
        const oldNum = oldValue === null || oldValue === undefined ? null : Number(oldValue);
        const newNum = newValue === null || newValue === undefined ? null : Number(newValue);
        if (oldNum !== newNum) {
          itemChanges.push({
            field: field.label,
            old_value: oldValue,
            new_value: newValue
          });
        }
      }
      else if (oldValue !== newValue) {
        itemChanges.push({
          field: field.label,
          old_value: oldValue,
          new_value: newValue
        });
      }
    }

    return itemChanges;
  }

  /**
   * Normalize sample images for comparison by keeping only relevant fields
   * Removes UI-specific fields like 'id', 'status' that don't affect actual data
   */
  private normalizeSampleImages(images: any): any {
    if (!images || !Array.isArray(images)) {
      return null;
    }

    // Keep only the essential fields for comparison
    return images
      .map(img => ({
      url: img.url,
      label: img.label || '',
      description: img.description || '',
      type: img.type || 'photo',
      image_type: img.image_type || 'sample',
      is_primary: !!img.is_primary,
      order_index: img.order_index || 0
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  private normalizeSampleVideos(videos: any): any {
    if (!videos || !Array.isArray(videos)) {
      return null;
    }

    return videos
      .map(vid => ({
        url: vid.url,
        label: vid.label || '',
        description: vid.description || '',
        type: vid.type || 'video',
        is_primary: !!vid.is_primary,
        order_index: vid.order_index || 0,
        duration_seconds: vid.duration_seconds ?? null
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  private normalizeLinks(links: any): any {
    if (!links || !Array.isArray(links)) {
      return null;
    }

    return links
      .map(link => ({
        title: (link.title || '').trim(),
        url: (link.url || '').trim(),
        description: (link.description || '').trim()
      }))
      .sort((a, b) => {
        const aKey = `${a.title}|${a.url}|${a.description}`.toLowerCase();
        const bKey = `${b.title}|${b.url}|${b.description}`.toLowerCase();
        return aKey.localeCompare(bKey);
      });
  }

  private normalizeTemplateFieldValue(key: string, value: any): any {
    if (key === 'is_active' || key === 'disable_max_upload_limit') {
      return !!value;
    }

    if (key === 'max_upload_size_mb') {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }

    return value === undefined ? null : value;
  }

  private normalizePhotoRequirements(req: any): any {
    if (!req || typeof req !== 'object') {
      return {
        angle: '',
        distance: '',
        lighting: '',
        focus: '',
        min_photos: null,
        max_photos: null,
        picture_required: true,
        max_video_duration_seconds: 30
      };
    }

    const normalized = {
      angle: (req.angle || '').trim(),
      distance: (req.distance || '').trim(),
      lighting: (req.lighting || '').trim(),
      focus: (req.focus || '').trim(),
      min_photos: req.min_photos === null || req.min_photos === undefined || req.min_photos === '' ? null : Number(req.min_photos),
      max_photos: req.max_photos === null || req.max_photos === undefined || req.max_photos === '' ? null : Number(req.max_photos),
      picture_required: req.picture_required === undefined ? true : !!req.picture_required,
      max_video_duration_seconds: req.max_video_duration_seconds === undefined || req.max_video_duration_seconds === null || req.max_video_duration_seconds === ''
        ? 30
        : Number(req.max_video_duration_seconds)
    };

    if (Number.isNaN(normalized.min_photos as any)) normalized.min_photos = null;
    if (Number.isNaN(normalized.max_photos as any)) normalized.max_photos = null;
    if (Number.isNaN(normalized.max_video_duration_seconds as any)) normalized.max_video_duration_seconds = 30;

    return normalized;
  }

  private isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.length === 0;
      return Object.keys(value).length === 0;
    }
    if (typeof value === 'string') return value.trim() === '';
    return false;
  }

  private normalizeValue(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && Object.keys(value).length === 0) return null;
    return value;
  }

  private sortedStringify(obj: any): string {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return JSON.stringify(obj.map(item => this.sortedStringify(item)));

    // Sort object keys alphabetically before stringifying
    const sortedObj: any = {};
    Object.keys(obj).sort().forEach(key => {
      sortedObj[key] = obj[key];
    });
    return JSON.stringify(sortedObj);
  }

  private proceedWithSave(templateData: any, createVersion: boolean, changes?: any, revisionDescription?: string, versionNotes?: string, versionOverride?: string): void {
    this.saving = true;

    // When creating a new version
    if (createVersion && this.editingTemplate) {
      // Increment the version for the new template
      const currentVersion = this.editingTemplate.version || '1.0';
      const newVersion = versionOverride?.trim() || this.getNextVersion(currentVersion);
      templateData.version = newVersion;

      // IMPORTANT: Pass the source template ID to maintain parent/group relationships
      templateData.source_template_id = this.editingTemplate.id;

      // Add version notes if provided
      if (versionNotes) {
        templateData.version_notes = versionNotes;
      }

      // Clean the name - remove any existing version suffixes before adding the new one
      let cleanName = templateData.name;
      // Remove all version patterns like (v1.0), (v1.1), etc.
      cleanName = cleanName.replace(/\s*\(v\d+\.\d+\)\s*/g, '').trim();
      // Add the new version
      templateData.name = `${cleanName} (v${newVersion})`;
    } else if (this.editingTemplate) {
      // Updating current version - use updateTemplate instead
      templateData.id = this.editingTemplate.id;
    }

    // Choose the appropriate API call
    const saveRequest = (createVersion || !this.editingTemplate)
      ? this.configService.createTemplate(templateData)
      : this.configService.updateTemplate(this.editingTemplate.id, templateData);

    // DEBUG: Simplified logging
    const subItemCount = templateData.items?.filter((i: any) => i.level === 1).length || 0;
    console.log('🚀 API PAYLOAD:', {
      total: templateData.items?.length || 0,
      parents: (templateData.items?.length || 0) - subItemCount,
      subItems: subItemCount,
      hasSubItems: subItemCount > 0
    });

    // Add timeout wrapper
    const timeoutId = setTimeout(() => {
      console.error('Save operation timed out after 30 seconds');
      this.saving = false;
      alert('Save operation timed out. Please try again.');
    }, 30000);

    saveRequest.subscribe({
      next: (response: any) => {
        clearTimeout(timeoutId);
        console.log('Template saved successfully:', response);

        // Get the template ID (either from response or existing template)
        const templateId = response.template_id || this.editingTemplate?.id;

        if (!templateId) {
          console.error('No template ID available');
          this.saving = false;
          alert('Error: Template ID not available');
          return;
        }

        // Update component data with returned template (includes permanent image URLs)
        if (response.template) {
          console.log('📦 Updating component with returned template data (permanent URLs)', response.template);
          this.updateComponentWithSavedTemplate(response.template);
        } else {
          console.warn('⚠️ Backend did not return template data in response');
        }

        // After saving template, integrate with document control system
        if (createVersion && this.editingTemplate && revisionDescription) {
          // Editing existing template - create new revision if it has a document
          if (this.editingTemplate.quality_document_metadata?.document_id) {
            this.createRevision(
              this.editingTemplate.quality_document_metadata.document_id,
              templateId,
              revisionDescription,
              null, // No automatic change detection
              versionNotes
            );
          } else {
            // First time creating document for existing template
            this.createDocument(templateId, templateData.name, revisionDescription, templateData);
          }
        } else if (!this.editingTemplate) {
          // New template - create document
          this.createDocument(templateId, templateData.name, 'Initial revision', templateData);
        } else {
          // Direct update without revision tracking (shouldn't happen with current flow)
          this.saving = false;
          alert('Template updated successfully!');
          this.router.navigate(['/quality/checklist/template-manager']);
        }
      },
      error: (error) => {
        clearTimeout(timeoutId);
        console.error('Error saving template:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        this.saving = false;

        // Show more detailed error information
        let errorMessage = 'Unknown error occurred';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status) {
          errorMessage = `HTTP ${error.status}: ${error.statusText || 'Unknown error'}`;
        }

        alert('Error saving template: ' + errorMessage);
      }
    });
  }

  /**
   * Create a new checklist document (first time)
   */
  private createDocument(templateId: number, title: string, revisionDescription: string, templateData: any): void {
    const documentData = {
      prefix: 'QA-CHK',
      title: title,
      description: templateData.description || '',
      department: 'QA' as const,
      category: templateData.category || 'quality_control',
      template_id: templateId,
      created_by: 'current_user', // TODO: Get from auth service
      revision_description: revisionDescription
    };

    this.configService.createChecklistDocument(documentData).subscribe({
      next: (result) => {
        console.log('Document created:', result);
        this.saving = false;
        alert(`✓ Document created: ${result.document_number}, Rev ${result.revision_number}\n\n${result.message}`);
        this.router.navigate(['/quality/checklist/template-manager']);
      },
      error: (error) => {
        console.error('Error creating document:', error);
        this.saving = false;
        alert('Template saved but failed to create document control entry: ' + (error.error?.error || error.message));
        this.router.navigate(['/quality/checklist/template-manager']);
      }
    });
  }

  /**
   * Create a new revision for existing document
   */
  private createRevision(documentId: number, templateId: number, revisionDescription: string, changes: any, notes?: string): void {
    // Calculate change counts (use 0 if no changes provided)
    const items_added = changes?.items_added?.length || 0;
    const items_removed = changes?.items_removed?.length || 0;
    const items_modified = changes?.items_modified?.length || 0;

    const revisionData = {
      document_id: documentId,
      template_id: templateId,
      revision_description: revisionDescription,
      changes_summary: changes ? this.generateChangesSummary(changes) : revisionDescription,
      items_added: items_added,
      items_removed: items_removed,
      items_modified: items_modified,
      changes_detail: changes || {}, // Full change object as JSON (empty if no automatic detection)
      created_by: 'current_user' // TODO: Get from auth service
    };

    if (notes) {
      (revisionData as any).notes = notes;
    }

    this.configService.createChecklistRevision(revisionData).subscribe({
      next: (result) => {
        console.log('Revision created:', result);
        this.saving = false;
        alert(`✓ Revision created: ${result.document_number}, Rev ${result.revision_number}\n\n${result.message}`);
        this.router.navigate(['/quality/checklist/template-manager']);
      },
      error: (error) => {
        console.error('Error creating revision:', error);
        this.saving = false;
        alert('Template saved but failed to create revision: ' + (error.error?.error || error.message));
        this.router.navigate(['/quality/checklist/template-manager']);
      }
    });
  }

  /**
   * Generate a human-readable changes summary
   */
  private generateChangesSummary(changes: any): string {
    if (!changes) {
      return 'Template updated';
    }

    const parts = [];

    if (changes.field_changes?.length) {
      parts.push(`${changes.field_changes.length} field change(s)`);
    }
    if (changes.items_added?.length) {
      parts.push(`${changes.items_added.length} item(s) added`);
    }
    if (changes.items_removed?.length) {
      parts.push(`${changes.items_removed.length} item(s) removed`);
    }
    if (changes.items_modified?.length) {
      parts.push(`${changes.items_modified.length} item(s) modified`);
    }

    return parts.join(', ') || 'No significant changes';
  }

  cancel(): void {
    this.router.navigate(['/quality/checklist/template-manager']);
  }

  // Import functionality
  openImportModal(): void {
    this.importError = null;
    this.importing = false;
    this.importManualName = '';
    this.importManualItemCount = 5;
    this.modalService.open(this.importModalRef, { size: 'lg', backdrop: 'static' });
  }

  /**
   * Open preview modal to show condensed read-only view of entire checklist
   */
  openPreviewModal(): void {
    this.modalService.open(this.previewModalRef, { size: 'xl', scrollable: true });
  }

  async onImportFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    this.importing = true;
    this.importError = null;

    try {
      let parsedTemplate;

      if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        console.log('📄 Importing from Word document...');
        parsedTemplate = await this.wordParser.parseWordToTemplate(file);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        console.log('📕 Importing from PDF...');
        parsedTemplate = await this.pdfParser.parsePdfToTemplate(file);
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        console.log('📊 Importing from CSV...');
        parsedTemplate = await this.pdfParser.parseCsvToTemplate(file);
      } else {
        throw new Error('Unsupported file format. Please upload a Word (.docx), PDF, or CSV file.');
      }

      // Populate the form with parsed data
      this.populateFormFromImport(parsedTemplate);

      // Close modal
      this.modalService.dismissAll();

      // Automatically save the imported template as a draft (with small delay to ensure form is populated)
      setTimeout(() => {
        this.saveImportedTemplate();
      }, 100);

      alert(`Successfully imported and saved ${parsedTemplate.items.length} items from ${file.name}`);
    } catch (error: any) {
      console.error('Import error:', error);
      this.importError = error.message || 'Failed to import file. Please check the format and try again.';
    } finally {
      this.importing = false;
      // Clear file input
      event.target.value = '';
    }
  }

  processManualImport(): void {
    if (!this.importManualName || !this.importManualItemCount) {
      return;
    }

    const parsedTemplate = this.pdfParser.createManualTemplate({
      name: this.importManualName,
      itemCount: this.importManualItemCount,
      category: 'quality_control'
    });

    this.populateFormFromImport(parsedTemplate);

    // Automatically save the manually created template as a draft (with small delay to ensure form is populated)
    setTimeout(() => {
      this.saveImportedTemplate();
    }, 100);

    alert(`Successfully created template with ${parsedTemplate.items.length} items`);
  }

  /**
   * Automatically save imported template as a draft to the server
   * Uploads any data URL images to the server first
   */
  private async saveImportedTemplate(): Promise<void> {
    if (this.templateForm.invalid) {
      console.warn('Template form is invalid, cannot auto-save');
      return;
    }

    console.log('Auto-saving imported template...');
    console.log('📤 Processing imported images...');

    // First, upload any data URL images to the server
    const uploadPromises: Promise<void>[] = [];

    this.items.controls.forEach((control, index) => {
      const itemFormGroup = control as FormGroup;
      const sampleImageUrl = itemFormGroup.get('sample_image_url')?.value;

      // Check if this is a data URL (from Word import)
      if (sampleImageUrl && sampleImageUrl.startsWith('data:')) {
        console.log(`   Item ${index + 1}: Converting data URL to uploaded image...`);
        uploadPromises.push(this.convertDataUrlToUpload(index, sampleImageUrl));
      }
    });

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      console.log(`⏳ Uploading ${uploadPromises.length} image(s)...`);
      try {
        await Promise.all(uploadPromises);
        console.log('✅ All images uploaded successfully');
      } catch (error) {
        console.error('❌ Some images failed to upload:', error);
        alert('Some images could not be uploaded. The template will be saved without those images.');
      }
    }

    const templateData = this.templateForm.value;

    // DEBUG: Log first 5 items to see their parent_id and level values
    console.log('🔍 FIRST 5 ITEMS IN TEMPLATEDATA:');
    templateData.items.slice(0, 5).forEach((item: any, idx: number) => {
      console.log(`  [${idx}] title="${item.title}" order=${item.order_index} parent_id=${item.parent_id} level=${item.level}`);
    });

    // DEBUG: Verify sub-items are in the data being auto-saved
    console.log('🔍 AUTO-SAVE CHECK:', {
      totalItemsInForm: this.items.length,
      totalItemsInData: templateData.items.length,
      subItemsInData: templateData.items.filter((i: any) => i.level === 1).length
    });

    // Log summary instead of full data to avoid console spam
    const itemsWithImages = templateData.items.filter((item: any) => item.sample_image_url).length;
    console.log('📤 Sending template to backend:', {
      name: templateData.name,
      totalItems: templateData.items.length,
      itemsWithImages,
      category: templateData.category
    });

    // Check for potentially truncated data URLs
    templateData.items.forEach((item: any, idx: number) => {
      if (item.sample_image_url && item.sample_image_url.startsWith('data:')) {
        const urlLength = item.sample_image_url.length;
        if (urlLength < 1000) {
          console.warn(`⚠️ Item ${idx + 1} has suspiciously short data URL (${urlLength} chars) - may be truncated!`);
        }
      }
    });

    // Save to server
    this.configService.createTemplate(templateData).subscribe({
      next: (response) => {
        console.log('✓ Imported template auto-saved successfully:', response);

        // Update the URL to reflect that we're now editing an existing template
        if (response && response.template_id) {
          console.log('✓ Template ID:', response.template_id);

          // Reload the template from the server to get the full data
          this.loadTemplate(response.template_id);

          // Update the URL without reloading the page
          this.router.navigate(['/quality/checklist/template-editor', response.template_id], { replaceUrl: true });

          // Enable auto-save after initial import save
          this.autoSaveEnabled = true;
        }
      },
      error: (error) => {
        console.error('✗ Failed to auto-save imported template:', error);
        // Don't show error alert here since the user can still manually save
        // Just log the error for debugging
      }
    });
  }

  /**
   * Update component data with saved template from backend (includes permanent URLs)
   */
  private updateComponentWithSavedTemplate(template: any): void {
    if (!template.items || !Array.isArray(template.items)) {
      return;
    }

    // Flatten items if needed
    const flattenedItems = this.flattenNestedItems(template.items || []);

    // Update sampleImages with permanent URLs from backend
    flattenedItems.forEach((item: any, index: number) => {
      if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
        const updatedImages: SampleImage[] = item.sample_images.map((img: any, imgIndex: number) => ({
          id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${imgIndex}`,
          url: img.url, // This now has permanent URL (no /temp/)
          label: img.label || (img.is_primary ? 'Sample Image' : `Reference ${imgIndex}`),
          description: img.description || '',
          type: img.type || 'photo',
          image_type: img.image_type || (img.is_primary ? 'sample' : 'reference'),
          is_primary: img.is_primary || false,
          order_index: img.order_index || imgIndex,
          status: 'loaded' as const
        }));

        this.sampleImages[index] = updatedImages;

        // Update form control with permanent URLs
        const itemFormGroup = this.items.at(index) as FormGroup;
        if (itemFormGroup) {
          itemFormGroup.patchValue({
            sample_image_url: item.sample_image_url || updatedImages.find(img => img.is_primary)?.url || updatedImages[0]?.url,
            sample_images: updatedImages
          }, { emitEvent: false });
        }
      }
    });

    console.log('✅ Updated component with permanent image URLs');
  }

  /**
   * Schedule an auto-save after user stops editing (debounced)
   */
  private scheduleAutoSave(): void {
    // Clear any existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Schedule new auto-save after 3 seconds of inactivity
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 3000);
  }

  /**
   * Perform auto-save of current template state
   */
  private performAutoSave(): void {
    if (!this.editingTemplate || this.templateForm.invalid || this.saving) {
      return;
    }

    console.log('📝 Auto-saving template changes...');

    const templateData = this.templateForm.value;

    // Remove quality_document_id as it's not part of the database schema
    delete templateData.quality_document_id;

    templateData.items = templateData.items.map((item: any) => item);

    // Update existing template
    this.configService.updateTemplate(this.editingTemplate.id, templateData).subscribe({
      next: (response) => {
        this.lastSavedAt = new Date();
        console.log('✓ Auto-save successful at', this.lastSavedAt.toLocaleTimeString());
      },
      error: (error) => {
        console.error('✗ Auto-save failed:', error);
        // Silently fail - user can still manually save
      }
    });
  }

  /**
   * Navigation dropdown actions
   */
  private shiftExpandedItemsOnInsert(insertIndex: number): void {
    const updated = new Set<number>();
    this.expandedItems.forEach(i => {
      updated.add(i >= insertIndex ? i + 1 : i);
    });
    this.expandedItems = updated;
  }

  private shiftIndexedDictionaryOnInsert<T>(dict: { [itemIndex: number]: T }, insertIndex: number): { [itemIndex: number]: T } {
    const updated: { [itemIndex: number]: T } = {};
    Object.keys(dict).forEach(key => {
      const oldIndex = parseInt(key, 10);
      const newIndex = oldIndex >= insertIndex ? oldIndex + 1 : oldIndex;
      updated[newIndex] = dict[oldIndex];
    });
    return updated;
  }

  private shiftMediaOnInsert(insertIndex: number): void {
    this.sampleImages = this.shiftIndexedDictionaryOnInsert(this.sampleImages, insertIndex);
    this.sampleVideos = this.shiftIndexedDictionaryOnInsert(this.sampleVideos, insertIndex);
  }

  addItemAbove(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const currentItem = this.items.at(index);
    const currentLevel = currentItem.get('level')?.value || 0;
    const parentId = currentItem.get('parent_id')?.value ?? null;
    const submissionType = currentItem.get('submission_type')?.value || 'photo';

    // Use the same FormGroup shape as regular items (includes submission_type, sample_images, etc.)
    const newItem = this.createItemFormGroup({
      title: 'New Item',
      level: currentLevel,
      parent_id: parentId,
      submission_type: submissionType,
      order_index: 0
    } as any);

    // Shift any index-based state before insert so we don't “move” expansion/media to the wrong row
    this.shiftExpandedItemsOnInsert(index);
    this.shiftMediaOnInsert(index);
    this.items.insert(index, newItem);

    this.recalculateOrderIndices();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  addItemBelow(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const currentItem = this.items.at(index);
    const currentLevel = currentItem.get('level')?.value || 0;
    const parentId = currentItem.get('parent_id')?.value ?? null;
    const submissionType = currentItem.get('submission_type')?.value || 'photo';
    const insertIndex = index + 1;

    // Use the same FormGroup shape as regular items (includes submission_type, sample_images, etc.)
    const newItem = this.createItemFormGroup({
      title: 'New Item',
      level: currentLevel,
      parent_id: parentId,
      submission_type: submissionType,
      order_index: 0
    } as any);

    this.shiftExpandedItemsOnInsert(insertIndex);
    this.shiftMediaOnInsert(insertIndex);
    this.items.insert(insertIndex, newItem);

    this.recalculateOrderIndices();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  async duplicateItem(index: number, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    const currentItem = this.items.at(index).value;
    const insertIndex = index + 1;

    // Create duplicate with same properties but new ID using the canonical item FormGroup shape
    const duplicateItem = this.createItemFormGroup({
      ...(currentItem as any),
      id: null,
      title: `${currentItem.title || 'Untitled'} (Copy)`,
      order_index: 0
    } as any);

    this.shiftExpandedItemsOnInsert(insertIndex);
    this.shiftMediaOnInsert(insertIndex);
    this.items.insert(insertIndex, duplicateItem);

    await this.duplicateSampleMedia(index, insertIndex, duplicateItem);

    this.recalculateOrderIndices();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    setTimeout(() => this.refreshActiveItemTracking());
  }

  private async duplicateSampleMedia(sourceIndex: number, targetIndex: number, targetItem: FormGroup): Promise<void> {
    await Promise.all([
      this.duplicateSampleImages(sourceIndex, targetIndex, targetItem),
      this.duplicateSampleVideos(sourceIndex, targetIndex, targetItem)
    ]);
  }

  private async duplicateSampleImages(sourceIndex: number, targetIndex: number, targetItem: FormGroup): Promise<void> {
    const sourceImages = this.sampleImages[sourceIndex];
    if (!sourceImages) {
      return;
    }

    const imagesArray = Array.isArray(sourceImages) ? sourceImages : [sourceImages];
    const duplicated: SampleImage[] = [];

    for (const img of imagesArray) {
      const newUrl = await this.duplicateMediaUrl(img.url, 'image');
      duplicated.push({
        ...img,
        id: `dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: newUrl
      });
    }

    this.sampleImages[targetIndex] = Array.isArray(sourceImages) ? duplicated : duplicated[0];

    const primaryUrl = duplicated.find(img => img.is_primary && img.image_type === 'sample')?.url || duplicated[0]?.url || null;
    targetItem.patchValue({
      sample_images: duplicated,
      sample_image_url: primaryUrl
    });
  }

  private async duplicateSampleVideos(sourceIndex: number, targetIndex: number, targetItem: FormGroup): Promise<void> {
    const sourceVideos = this.sampleVideos[sourceIndex];
    if (!sourceVideos) {
      return;
    }

    const videosArray = Array.isArray(sourceVideos) ? sourceVideos : [sourceVideos];
    const duplicated: SampleVideo[] = [];

    for (const vid of videosArray) {
      const newUrl = await this.duplicateMediaUrl(vid.url, 'video');
      duplicated.push({
        ...vid,
        id: `dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: newUrl
      });
    }

    this.sampleVideos[targetIndex] = Array.isArray(sourceVideos) ? duplicated : duplicated[0];
    targetItem.patchValue({
      sample_videos: duplicated
    });
  }

  private async duplicateMediaUrl(url: string, type: 'image' | 'video'): Promise<string> {
    if (!url) {
      return url;
    }

    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }

      const blob = await response.blob();
      const extension = blob.type?.includes('/') ? blob.type.split('/')[1] : (type === 'video' ? 'mp4' : 'jpg');
      const fileName = `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type || (type === 'video' ? 'video/mp4' : 'image/jpeg') });

      const tempId = `${type}_duplicate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const upload = await this.photoUploadService.uploadTemporaryImage(file, tempId);
      if (upload?.success && upload?.url) {
        return upload.url;
      }
    } catch (error) {
      console.warn('Failed to duplicate media, falling back to original URL', error);
    }

    return url;
  }

  moveItemUp(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (index === 0) return; // Can't move first item up

    this.performDrop(index, index - 1);
  }

  moveItemDown(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (index >= this.items.length - 1) return; // Can't move last item down

    this.performDrop(index, index + 1);
  }

  deleteItemFromNav(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const item = this.items.at(index);
    const itemTitle = item.get('title')?.value || 'this item';

    if (confirm(`Are you sure you want to delete "${itemTitle}" and all its sub-items?`)) {
      this.removeItem(index);
    }
  }

  private populateFormFromImport(parsedTemplate: any): void {
    console.log('🔍 populateFormFromImport called with:', parsedTemplate);
    console.log('   - Template name:', parsedTemplate.name);
    console.log('   - Items to import:', parsedTemplate.items?.length || 0);

    // Log the structure of items array
    if (parsedTemplate.items && Array.isArray(parsedTemplate.items)) {
      const parentCount = parsedTemplate.items.filter((i: any) => i.level === 0).length;
      const childCount = parsedTemplate.items.filter((i: any) => i.level === 1).length;
      console.log(`   - Parent items: ${parentCount}, Sub-items: ${childCount}`);

      parsedTemplate.items.forEach((item: any, idx: number) => {
        if (item.level === 1) {
          console.log(`   [${idx}] 🔗 Sub-item: order=${item.order_index}, parent_id=${item.parent_id}, level=${item.level}`);
        }
      });
    }

    // Clear existing items and sample images
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }
    this.sampleImages = {};
    console.log('✓ Cleared existing items and sampleImages');

    // Populate basic info
    this.templateForm.patchValue({
      name: parsedTemplate.name || 'Imported Template',
      category: parsedTemplate.category || 'quality_control',
      description: parsedTemplate.description || '',
      part_number: parsedTemplate.part_number || '',
      product_type: parsedTemplate.product_type || '',
      customer_part_number: parsedTemplate.customer_part_number || '',
      revision: parsedTemplate.revision || '',
      original_filename: parsedTemplate.original_filename || '',
      is_active: true
    });

    console.log('✓ Basic template info populated');
    console.log('   - Form items array length BEFORE adding:', this.items.length);

    // Add all items (already flattened by parser - no need to process children)
    if (parsedTemplate.items && Array.isArray(parsedTemplate.items)) {
      console.log(`📝 Processing ${parsedTemplate.items.length} items (including sub-items)...`);
      parsedTemplate.items.forEach((item: any, index: number) => {
        const levelLabel = item.level === 1 ? ` (sub-item, parent_id: ${item.parent_id})` : '';
        console.log(`   Adding item ${index + 1}: ${item.title}${levelLabel}`);
        this.addItemToForm(item, index);
      });
    } else {
      console.warn('⚠️ No items array found in parsedTemplate!');
    }

    // Trigger change detection to update UI
    this.cdr.detectChanges();
  }
}

