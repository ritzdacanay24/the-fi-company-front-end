import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { QuillModule, QuillModules } from 'ngx-quill';

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

@Component({
  selector: 'app-checklist-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, DragDropModule, QualityDocumentSelectorComponent, RouterModule, QuillModule],
  template: `
    <div class="container-fluid">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-11 col-xl-10 col-xxl-8">
          
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

          <div class="card shadow-sm border-0">
            <div class="card-body p-4">

          <!-- Main Content -->
          <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()" class="settings-form" autocomplete="off">
            
            <div class="body">
              
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
                    <label class="form-label">Template Name</label>
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
                    <label class="form-label">Category</label>
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
                  <div class="col-12 mb-3">
                    <label class="form-label">Description</label>
                    <div class="border rounded">
                      <quill-editor 
                        formControlName="description" 
                        [modules]="quillConfig"
                        placeholder="Enter template description"
                        [styles]="{height: '150px'}">
                      </quill-editor>
                    </div>
                    <div class="form-text">
                      <i class="mdi mdi-information-outline me-1"></i>
                      Detailed description of what this template covers.
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

              <!-- Checklist Items Section -->
              <div class="mb-4 pb-4 border-bottom">
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 class="h5 mb-1">Checklist Items</h3>
                      <p class="text-muted mb-0">
                        Define inspection items and photo requirements for this template.
                      </p>
                    </div>
                    <button type="button" class="btn btn-primary " (click)="addItem()">
                      <i class="mdi mdi-plus me-2"></i>
                      Add Item
                    </button>
                  </div>
                </div>

                <!-- Items List -->
                <div formArrayName="items" cdkDropList (cdkDropListDropped)="dropItem($event)">
                  <div *ngFor="let item of items.controls; let i = index" 
                       class="card mb-3" 
                       [formGroupName]="i" 
                       [class.ms-4]="item.get('level')?.value === 1"
                       [class.border-start]="item.get('level')?.value === 1"
                       [class.border-4]="item.get('level')?.value === 1"
                       [class.border-primary]="item.get('level')?.value === 1"
                       cdkDrag>
                    
                    <!-- Drag Preview (what you see while dragging) -->
                    <div class="card drag-preview" *cdkDragPreview>
                      <div class="card-header bg-light">
                        <i class="mdi mdi-drag-vertical me-2"></i>
                        <span *ngIf="item.get('level')?.value === 0">Item {{getItemNumber(i)}}</span>
                        <span *ngIf="item.get('level')?.value === 1">Sub-item {{getItemNumber(i)}}</span>
                        : {{item.get('title')?.value || 'Untitled'}}
                      </div>
                    </div>
                    
                    <!-- Drag Handle and Header -->
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                      <div class="d-flex align-items-center">
                        <div class="drag-handle me-3" cdkDragHandle title="Drag to reorder">
                          <i class="mdi mdi-drag-vertical text-muted fs-4"></i>
                        </div>
                        <h6 class="mb-0">
                          <span *ngIf="item.get('level')?.value === 0 || !item.get('level')?.value">
                            <i class="mdi mdi-file-document-outline me-1"></i>
                            Item {{getItemNumber(i)}}
                          </span>
                          <span *ngIf="item.get('level')?.value === 1" class="text-primary">
                            <i class="mdi mdi-subdirectory-arrow-right me-1"></i>
                            Sub-item {{getItemNumber(i)}}
                          </span>
                        </h6>
                      </div>
                      <div class="d-flex align-items-center gap-2">
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" formControlName="is_required" [id]="'required-' + i">
                          <label class="form-check-label" [for]="'required-' + i">
                            Required
                          </label>
                        </div>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-primary" 
                          (click)="addSubItem(i)"
                          *ngIf="item.get('level')?.value === 0 || !item.get('level')?.value"
                          title="Add sub-item below this item">
                          <i class="mdi mdi-plus me-1"></i>Add Sub-item
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-secondary" 
                          (click)="promoteToParent(i)"
                          *ngIf="item.get('level')?.value === 1"
                          title="Convert to parent item">
                          <i class="mdi mdi-arrow-up-bold me-1"></i>Promote
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-danger" 
                          (click)="removeItem(i)"
                          title="Remove item">
                          <i class="mdi mdi-delete"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Item Content -->
                    <div class="card-body">
                      <div class="row mb-3">
                        <div class="col-md-8">
                          <label class="form-label">Title</label>
                          <input type="text" class="form-control" formControlName="title" placeholder="Enter item title">
                          <div class="form-text">
                            <i class="mdi mdi-information-outline me-1"></i>
                            Clear title describing what needs to be inspected.
                          </div>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Order</label>
                          <input type="number" class="form-control" formControlName="order_index" min="1">
                          <div class="form-text">
                            <i class="mdi mdi-information-outline me-1"></i>
                            Display order for this item.
                          </div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Description</label>
                        <div class="border rounded">
                          <quill-editor 
                            formControlName="description" 
                            [modules]="quillConfig"
                            placeholder="Enter item description (supports rich text formatting)"
                            [styles]="{height: '200px'}">
                          </quill-editor>
                        </div>
                        <div class="form-text">
                          <i class="mdi mdi-information-outline me-1"></i>
                          Detailed instructions for this inspection item. Rich text formatting is supported.
                        </div>
                      </div>

                      <!-- Photo Requirements -->
                      <div class="mb-3">
                        <div class="mb-2">
                          <label class="form-label mb-0">Photo Requirements</label>
                        </div>

                        <div class="border rounded p-3 bg-light">
                            <div formGroupName="photo_requirements">
                              <div class="row mb-3">
                                <div class="col-md-3 mb-3">
                                  <label class="form-label">Photo Angle</label>
                                  <select class="form-select" formControlName="angle">
                                    <option value="">Any Angle</option>
                                    <option value="front">Front View</option>
                                    <option value="back">Back View</option>
                                    <option value="side">Side View</option>
                                    <option value="top">Top View</option>
                                    <option value="bottom">Bottom View</option>
                                    <option value="diagonal">Diagonal View</option>
                                  </select>
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    Required viewing angle for photos.
                                  </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                  <label class="form-label">Photo Distance</label>
                                  <select class="form-select" formControlName="distance">
                                    <option value="">Any Distance</option>
                                    <option value="close">Close-up</option>
                                    <option value="medium">Medium</option>
                                    <option value="far">Wide View</option>
                                  </select>
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    Required distance for photo capture.
                                  </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                  <label class="form-label">Lighting Conditions</label>
                                  <select class="form-select" formControlName="lighting">
                                    <option value="">Any Lighting</option>
                                    <option value="bright">Bright</option>
                                    <option value="normal">Normal</option>
                                    <option value="dim">Dim</option>
                                  </select>
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    Required lighting conditions.
                                  </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                  <label class="form-label">Focus Area</label>
                                  <input type="text" class="form-control" formControlName="focus" placeholder="e.g., connector pins">
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    Specific area to focus on in photos.
                                  </div>
                                </div>
                              </div>

                              <div class="row">
                                <div class="col-md-6 mb-3">
                                  <label class="form-label">Minimum Photos Required</label>
                                  <input type="number" class="form-control" formControlName="min_photos" min="0" max="10" placeholder="0">
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    Minimum number of photos required for this item.
                                  </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                  <label class="form-label">Maximum Photos Allowed</label>
                                  <input type="number" class="form-control" formControlName="max_photos" min="0" max="10" placeholder="10">
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    Maximum number of photos allowed for this item.
                                  </div>
                                </div>
                              </div>
                              
                              <div class="row">
                                <div class="col-md-12 mb-3">
                                  <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" formControlName="picture_required" [id]="'picture-required-' + i">
                                    <label class="form-check-label" [for]="'picture-required-' + i">
                                      <strong>Picture Required</strong>
                                    </label>
                                  </div>
                                  <div class="form-text">
                                    <i class="mdi mdi-information-outline me-1"></i>
                                    When enabled, users must take a photo. When disabled, users can simply confirm the item without capturing a photo.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Primary Sample Image -->
                        <div class="mb-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <label class="form-label mb-0">Primary Sample Image</label>
                              <small class="d-block text-muted">The main image users should replicate when taking photos</small>
                            </div>
                            <button type="button" class="btn btn-outline-primary" 
                                    (click)="openPrimarySampleImageUpload(i)"
                                    [disabled]="uploadingImage">
                              <span *ngIf="uploadingImage" class="spinner-border spinner-border-sm me-1" role="status"></span>
                              <i *ngIf="!uploadingImage" class="mdi" [class.mdi-plus]="!hasPrimarySampleImage(i)" [class.mdi-image-edit]="hasPrimarySampleImage(i)"></i>
                              {{uploadingImage ? 'Uploading...' : (hasPrimarySampleImage(i) ? 'Replace' : 'Add Sample')}}
                            </button>
                          </div>
                          
                          <div *ngIf="hasPrimarySampleImage(i)" class="d-flex align-items-center border rounded p-3 bg-light">
                            <div class="position-relative me-3">
                              <img [src]="getPrimarySampleImageUrl(i)"
                                   class="img-thumbnail border-primary"
                                   style="width: 150px; height: 150px; object-fit: contain; cursor: pointer; background: white; border-width: 3px !important;"
                                   [alt]="getPrimarySampleImage(i)?.label || 'Primary sample image'"
                                   (click)="previewSampleImage(i)"
                                   (error)="onSampleImageError(i)"
                                   (load)="onSampleImageLoad(i)">
                              <span class="badge bg-primary position-absolute bottom-0 start-50 translate-middle-x mb-1">
                                Primary
                              </span>
                              <button type="button"
                                      class="btn btn-danger position-absolute top-0 end-0"
                                      style="transform: translate(50%, -50%); width: 24px; height: 24px; padding: 0; border-radius: 50%;"
                                      (click)="removePrimarySampleImage(i)">
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
                          
                          <div *ngIf="!hasPrimarySampleImage(i)" class="text-muted text-center py-4 border-2 border-dashed rounded bg-white" style="border: 2px dashed #dee2e6;">
                            <i class="mdi mdi-camera-outline text-primary mb-2" style="font-size: 2.5rem;"></i>
                            <p class="mb-0"><strong>No primary sample image</strong></p>
                            <p class="mb-0 small text-muted">Add the main reference photo users should replicate</p>
                          </div>
                        </div>

                        <!-- Reference Images -->
                        <div class="mb-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <label class="form-label mb-0">Reference Images</label>
                              <small class="d-block text-muted">Additional context images (max 5) - different angles, examples, diagrams</small>
                            </div>
                            <button type="button" class="btn btn-outline-secondary btn-sm" 
                                    (click)="openReferenceImageUpload(i)"
                                    [disabled]="uploadingImage || getReferenceImageCount(i) >= 5">
                              <span *ngIf="uploadingImage" class="spinner-border spinner-border-sm me-1" role="status"></span>
                              <i *ngIf="!uploadingImage" class="mdi mdi-plus"></i>
                              {{uploadingImage ? 'Uploading...' : 'Add Reference'}}
                              <span class="badge bg-secondary ms-1">{{getReferenceImageCount(i)}}/5</span>
                            </button>
                          </div>
                          
                          <!-- Reference Images Grid -->
                          <div *ngIf="getReferenceImages(i).length > 0" class="row g-2">
                            <div class="col-6 col-md-4" *ngFor="let refImage of getReferenceImages(i); let refIdx = index">
                              <div class="position-relative border rounded p-2 bg-white">
                                <img [src]="refImage.url"
                                     class="img-thumbnail w-100"
                                     style="height: 100px; object-fit: cover; cursor: pointer;"
                                     [alt]="refImage.label || 'Reference image'"
                                     (click)="previewReferenceImage(i, refIdx)">
                                <button type="button"
                                        class="btn btn-danger btn-sm position-absolute top-0 end-0"
                                        style="transform: translate(25%, -25%); width: 20px; height: 20px; padding: 0; border-radius: 50%;"
                                        (click)="removeReferenceImage(i, refIdx)">
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
                          
                          <div *ngIf="getReferenceImages(i).length === 0" class="text-muted text-center py-3 border rounded bg-light">
                            <i class="mdi mdi-image-multiple-outline mb-2" style="font-size: 1.5rem;"></i>
                            <p class="mb-0 small">No reference images added</p>
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

            </div> <!-- end body container -->
          </form>
            </div>
            
            <div class="card-footer bg-light border-top d-flex p-3">
              <button type="button" class="btn btn-outline-secondary me-2" [disabled]="saving" (click)="cancel()">
                <i class="mdi mdi-close me-1"></i>Cancel
              </button>
              <button type="submit" class="btn btn-success ms-auto" [disabled]="!templateForm.valid || saving" (click)="saveTemplate()">
                @if (saving) {
                  <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                } @else {
                  <i class="mdi mdi-content-save me-1"></i>{{editingTemplate ? 'Save as New Version' : 'Create Template'}}
                }
              </button>
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

    <!-- Sample Image Upload Modal (keeping existing modal for now) -->
    <!-- Add your existing modal templates here -->
  `,
  styles: [`
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
  `]
})
export class ChecklistTemplateEditorComponent implements OnInit {
  @ViewChild('importModal') importModalRef!: TemplateRef<any>;
  @ViewChild('imagePreviewModal') imagePreviewModalRef!: TemplateRef<any>;
  
  templateForm: FormGroup;
  editingTemplate: ChecklistTemplate | null = null;
  saving = false;
  loading = false;
  uploadingImage = false;
  selectedQualityDocument: QualityDocumentSelection | null = null;
  
  // Import functionality
  importing = false;
  importError: string | null = null;
  importManualName = '';
  importManualItemCount = 5;
  
  // Sample image management - single image per item
  sampleImages: { [itemIndex: number]: SampleImage | SampleImage[] | null } = {};
  
  // Image preview
  previewImageUrl: string | null = null;
  
  // Auto-save functionality
  autoSaveEnabled = false;
  lastSavedAt: Date | null = null;
  private autoSaveTimeout: any = null;
  
  // Quill editor configuration
  quillConfig: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
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
    this.templateForm = this.createTemplateForm();
  }

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.loadTemplate(parseInt(templateId));
    }
    
    // Enable auto-save after form changes (with 3 second debounce)
    this.templateForm.valueChanges.subscribe(() => {
      if (this.autoSaveEnabled && this.editingTemplate) {
        this.scheduleAutoSave();
      }
    });
  }

  createTemplateForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: [''],
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

  get items(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  loadTemplate(id: number): void {
    this.loading = true;
    this.configService.getTemplate(id).subscribe({
      next: (template) => {
        this.editingTemplate = template;
        this.populateForm(template);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.loading = false;
        // Handle error - maybe redirect back to template manager
      }
    });
  }

  populateForm(template: ChecklistTemplate): void {
    this.templateForm.patchValue({
      name: template.name,
      category: template.category,
      description: template.description,
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

    // Flatten items if backend returns nested structure (children inside parents)
    let flattenedItems: any[] = [];
    if (template.items) {
      template.items.forEach((item: any) => {
        flattenedItems.push(item);
        // If item has children array, flatten them into main array
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach((child: any) => {
            flattenedItems.push(child);
          });
        }
      });
    }

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
              sample_images: loadedImages
            });
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
              sample_images: [this.sampleImages[index] as SampleImage]
            });
          }
        }
      });
    }
  }

  createItemFormGroup(item?: ChecklistItem): FormGroup {
    return this.fb.group({
      id: [item?.id || null], // Include ID for change detection
      title: [item?.title || '', Validators.required],
      description: [item?.description || ''],
      is_required: [item?.is_required || false],
      order_index: [item?.order_index || this.items.length + 1],
      photo_requirements: this.fb.group({
        angle: [item?.photo_requirements?.angle || ''],
        distance: [item?.photo_requirements?.distance || ''],
        lighting: [item?.photo_requirements?.lighting || ''],
        focus: [item?.photo_requirements?.focus || ''],
        min_photos: [item?.photo_requirements?.min_photos || null],
        max_photos: [item?.photo_requirements?.max_photos || null],
        picture_required: [item?.photo_requirements?.picture_required !== undefined ? item?.photo_requirements?.picture_required : true] // Default to true
      }),
      sample_image_url: [item?.sample_image_url || item?.sample_images?.[0]?.url || null], // Use sample_image_url or first sample_images URL
      sample_images: [item?.sample_images || null], // NEW: Array of all sample/reference images
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
        picture_required: hasImages // Set to false if no images, true if images exist
      }
    });
    
    this.items.push(itemGroup);
  }

  addItem(): void {
    const newIndex = this.items.length;
    this.items.push(this.createItemFormGroup());
  }

  /**
   * Add a sub-item (child) under a parent item
   */
  addSubItem(parentIndex: number): void {
    const parentItem = this.items.at(parentIndex);
    const parentOrderIndex = parentItem.get('order_index')?.value || (parentIndex + 1);
    
    // Count existing children for this parent
    let childCount = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      if (item.get('parent_id')?.value === parentOrderIndex) {
        childCount++;
      }
    }
    
    // Calculate the new sub-item's order_index (e.g., 5.1, 5.2, 5.3)
    const newOrderIndex = parentOrderIndex + ((childCount + 1) * 0.1);
    
    // Create new sub-item with proper form group structure
    const subItem = this.fb.group({
      title: [`Sub-item ${childCount + 1}`, Validators.required],
      description: [''],
      order_index: [newOrderIndex],
      is_required: [true],
      sample_image_url: [null],
      sample_images: [null], // NEW: Array of all sample/reference images
      level: [1], // Child level
      parent_id: [parentOrderIndex],
      photo_requirements: this.fb.group({
        angle: [''],
        distance: [''],
        lighting: [''],
        focus: [''],
        min_photos: [1],
        max_photos: [5],
        picture_required: [true] // Default to true
      })
    });
    
    // Insert right after the last child of this parent (or after parent if no children)
    let insertIndex = parentIndex + 1;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      if (item.get('parent_id')?.value === parentOrderIndex) {
        insertIndex = i + 1;
      } else if (item.get('level')?.value === 0) {
        // Hit another parent item, stop here
        break;
      }
    }
    
    this.items.insert(insertIndex, subItem);
    
    // Trigger change detection to ensure UI updates
    this.cdr.detectChanges();
  }

  removeItem(index: number): void {
    const item = this.items.at(index);
    const isParent = item.get('level')?.value === 0 || !item.get('level')?.value;
    const orderIndex = item.get('order_index')?.value;
    
    // If removing a parent, also remove all its children
    if (isParent) {
      const childIndicesToRemove: number[] = [];
      for (let i = 0; i < this.items.length; i++) {
        if (this.items.at(i).get('parent_id')?.value === orderIndex) {
          childIndicesToRemove.push(i);
        }
      }
      
      // Remove children first (in reverse order to maintain indices)
      childIndicesToRemove.reverse().forEach(childIndex => {
        this.items.removeAt(childIndex);
        delete this.sampleImages[childIndex];
      });
    }
    
    // Remove the item itself
    this.items.removeAt(index);
    delete this.sampleImages[index];
    
    // Rebuild sample images dictionary with updated indices
    const tempImages = { ...this.sampleImages };
    this.sampleImages = {};
    Object.keys(tempImages).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex > index) {
        this.sampleImages[oldIndex - 1] = tempImages[oldIndex];
      } else if (oldIndex < index) {
        this.sampleImages[oldIndex] = tempImages[oldIndex];
      }
    });
  }

  dropItem(event: CdkDragDrop<string[]>): void {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    
    if (previousIndex === currentIndex) {
      return; // No change
    }
    
    const movedItem = this.items.at(previousIndex);
    const movedLevel = movedItem.get('level')?.value || 0;
    const movedOrderIndex = movedItem.get('order_index')?.value;
    
    // Move the item in the array
    moveItemInArray(this.items.controls, previousIndex, currentIndex);
    
    // Also move sample images to match the new indices
    const movedImage = this.sampleImages[previousIndex];
    const tempImages = { ...this.sampleImages };
    this.sampleImages = {};
    
    // Rebuild sample images dictionary with updated indices
    Object.keys(tempImages).forEach(key => {
      const oldIndex = parseInt(key);
      let newIndex = oldIndex;
      
      if (oldIndex === previousIndex) {
        // This is the moved item
        newIndex = currentIndex;
      } else if (previousIndex < currentIndex) {
        // Item moved down - shift items between old and new position up
        if (oldIndex > previousIndex && oldIndex <= currentIndex) {
          newIndex = oldIndex - 1;
        }
      } else {
        // Item moved up - shift items between new and old position down
        if (oldIndex >= currentIndex && oldIndex < previousIndex) {
          newIndex = oldIndex + 1;
        }
      }
      
      this.sampleImages[newIndex] = tempImages[oldIndex];
    });
    
    // Check what's around the dropped position to determine new parent
    const itemAbove = currentIndex > 0 ? this.items.at(currentIndex - 1) : null;
    const itemBelow = currentIndex < this.items.length - 1 ? this.items.at(currentIndex + 1) : null;
    
    const aboveLevel = itemAbove?.get('level')?.value || 0;
    const belowLevel = itemBelow?.get('level')?.value || 0;
    const aboveOrderIndex = itemAbove?.get('order_index')?.value;
    const aboveParentId = itemAbove?.get('parent_id')?.value;
    
    // Smart re-parenting based on drop position
    if (itemAbove === null) {
      movedItem.get('level')?.setValue(0);
      movedItem.get('parent_id')?.setValue(null);
    } else if (aboveLevel === 0 && (belowLevel === 1 || itemBelow === null)) {
      const newParentId = Math.floor(aboveOrderIndex);
      movedItem.get('level')?.setValue(1);
      movedItem.get('parent_id')?.setValue(newParentId);
    } else if (aboveLevel === 1) {
      movedItem.get('level')?.setValue(1);
      movedItem.get('parent_id')?.setValue(aboveParentId);
    } else if (aboveLevel === 0 && belowLevel === 0) {
      movedItem.get('level')?.setValue(0);
      movedItem.get('parent_id')?.setValue(null);
    }
    
    // If moving a parent item, also move all its children
    if (movedLevel === 0) {
      const movedItemOrderIndex = Math.floor(movedOrderIndex);
      const children: { index: number, control: any }[] = [];
      
      // Find all children of the moved parent (before the move)
      this.items.controls.forEach((item, index) => {
        if (item.get('parent_id')?.value === movedItemOrderIndex && index !== currentIndex) {
          children.push({ index, control: item });
        }
      });
      
      // Move children to be right after their parent
      if (children.length > 0) {
        console.log(`Moving ${children.length} children with parent`);
        
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
    
    // Trigger change detection
    this.cdr.detectChanges();
  }
  
  /**
   * Recalculate order_index for all items based on their position and hierarchy
   */
  private recalculateOrderIndices(): void {
    let currentParentIndex = 1;
    const parentOrderMap = new Map<number, number>(); // Maps old parent_id to new order_index
    const childCounters = new Map<number, number>(); // Tracks child count per parent
    
    this.items.controls.forEach((control, index) => {
      const level = control.get('level')?.value || 0;
      const parentId = control.get('parent_id')?.value;
      
      if (level === 0) {
        // Parent item - assign whole number and track mapping
        const oldOrderIndex = control.get('order_index')?.value;
        control.get('order_index')?.setValue(currentParentIndex);
        
        // Map old parent order to new parent order for children
        if (oldOrderIndex) {
          parentOrderMap.set(Math.floor(oldOrderIndex), currentParentIndex);
        }
        
        currentParentIndex++;
      } else {
        // Child item - decimal based on parent's current order_index
        // Find the parent's current order_index
        let parentOrderIndex = parentId;
        
        // Look for the parent in our items array
        for (let i = 0; i < this.items.controls.length; i++) {
          const item = this.items.at(i);
          const itemLevel = item.get('level')?.value || 0;
          const itemOrderIndex = item.get('order_index')?.value;
          
          if (itemLevel === 0 && Math.floor(itemOrderIndex) === parentId) {
            parentOrderIndex = itemOrderIndex;
            break;
          }
        }
        
        // Update parent_id to match current parent order if needed
        if (parentOrderIndex !== parentId) {
          control.get('parent_id')?.setValue(parentOrderIndex);
        }
        
        // Count children for this parent
        const childCount = childCounters.get(parentOrderIndex) || 0;
        childCounters.set(parentOrderIndex, childCount + 1);
        
        const orderIndex = parentOrderIndex + ((childCount + 1) / 10);
        control.get('order_index')?.setValue(orderIndex);
      }
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
  private getNextVersion(currentVersion: string): string {
    if (!currentVersion) return '1.0';
    
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    
    // Increment minor version
    return `${major}.${minor + 1}`;
  }

  /**
   * Get display number for item (e.g., "14" for parent, "14.1" for first child)
   */
  getItemNumber(itemIndex: number): string {
    const item = this.items.at(itemIndex);
    const orderIndex = item.get('order_index')?.value;
    const level = item.get('level')?.value || 0;
    
    if (level === 0) {
      // Parent item - show whole number
      return Math.floor(orderIndex).toString();
    } else {
      // Child item - show decimal (e.g., 14.1, 14.2)
      return orderIndex.toFixed(1);
    }
  }

  openSampleImageUpload(itemIndex: number): void {
    console.log('Opening file upload for item index:', itemIndex);
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event: any) => {
      console.log('File input changed, event:', event);
      const file = event.target.files[0];
      console.log('Selected file:', file);
      
      if (file && file.type.startsWith('image/')) {
        console.log('Valid image file selected, starting upload...');
        try {
          await this.uploadSampleImage(itemIndex, file);
          console.log('Upload completed successfully');
        } catch (error) {
          console.error('Upload failed with error:', error);
        }
      } else {
        console.error('Invalid file selected:', file?.type);
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

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('File size too large. Maximum size is 5MB');
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

      // Show loading state
      console.log('Starting image upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        itemIndex: itemIndex,
        tempId: tempId
      });
      
      // Upload the image to the server
      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);
      
      console.log('Upload response received:', response);
      
      if (response && response.success && response.url) {
        console.log('Creating new sample image with URL:', response.url);
        
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

        console.log('Created sample image object:', newImage);

        // Set the single image for this item
        this.sampleImages[itemIndex] = newImage;
        
        // Update the form control with the sample image
        const itemFormGroup = this.items.at(itemIndex) as FormGroup;
        if (itemFormGroup) {
          const sampleImageControl = itemFormGroup.get('sample_image_url');
          if (sampleImageControl) {
            sampleImageControl.setValue(newImage.url);
            console.log('Updated form control with sample image URL:', newImage.url);
          }
        }
        
        console.log('Sample image uploaded successfully:', response.url);
        console.log('Current sample image for item', itemIndex, ':', this.sampleImages[itemIndex]);
        
        // Force change detection to update the UI
        // This ensures the new image appears immediately in the template
        this.cdr.detectChanges();
        
        setTimeout(() => {
          console.log('Force change detection - sample image updated');
          console.log('After timeout - getSampleImage returns:', this.getSampleImage(itemIndex));
          console.log('Form value for this item:', this.items.at(itemIndex)?.value);
        }, 100);
        
      } else {
        const errorMsg = response?.error || 'Upload failed - no URL returned';
        console.error('Upload failed:', errorMsg, response);
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
      
      console.log(`✅ Converted and uploaded data URL for item ${itemIndex + 1}`);
    } catch (error) {
      console.error(`❌ Failed to convert/upload data URL for item ${itemIndex + 1}:`, error);
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
      
      console.log(`✓ Converted data URL to Blob: ${mime}, ${bytes.length} bytes`);
      
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
        console.log('Removed sample image from form control');
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
        
        console.log('Primary sample image uploaded successfully', imageArray);
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
        
        console.log('Reference image uploaded successfully', imageArray);
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

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    
    const templateData = this.templateForm.value;
    
    // DEBUG: Log sample_images from form before save
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
    templateData.items = templateData.items.map((item: any) => {
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
      
      return item;
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

      modalRef.result.then(
        (result) => {
          // Create new version with user's description
          this.proceedWithSave(templateData, true, null, result.revisionDescription, result.notes);
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
      { key: 'is_active', label: 'Active Status' }
    ];

    for (const field of fieldsToCheck) {
      const oldValue = originalTemplate[field.key];
      const newValue = newData[field.key];
      
      // Normalize boolean values (database may store as 1/0, form uses true/false)
      const normalizedOld = field.key === 'is_active' ? !!oldValue : oldValue;
      const normalizedNew = field.key === 'is_active' ? !!newValue : newValue;
      
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
    const oldItems = originalTemplate.items || [];
    const newItems = newData.items || [];

    console.log('🔍 Starting item comparison:', {
      oldCount: oldItems.length,
      newCount: newItems.length
    });

    // Build a map of NEW items by their ID (from form's hidden id field)
    const newItemsById = new Map<number, any>();
    let newItemsWithoutId = 0;
    newItems.forEach((item: any) => {
      if (item.id) {
        newItemsById.set(item.id, item);
      } else {
        newItemsWithoutId++;
        console.warn('⚠️ New item missing ID:', item.title);
      }
    });

    console.log('📋 New items with IDs:', Array.from(newItemsById.keys()));
    console.log('📋 New items WITHOUT IDs:', newItemsWithoutId);
    
    // If ALL new items are missing IDs, this is likely a data issue - skip item comparison
    if (newItemsWithoutId === newItems.length && newItems.length > 0) {
      console.error('❌ All new items are missing IDs - cannot perform proper comparison. Skipping item diff.');
      console.error('   This usually means the form is not properly preserving item IDs from the database.');
      // Still compare metadata fields, but skip item-level changes
      return changes;
    }

    // Check each OLD item
    oldItems.forEach((oldItem: any) => {
      if (!oldItem.id) {
        console.warn('⚠️ Old item missing ID:', oldItem.title);
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
        console.log('❌ Item removed:', oldItem.title, '(ID:', oldItem.id, ')');
      } else {
        // Item exists in both - check for modifications
        const itemChanges = this.compareItems(oldItem, newItem);
        if (itemChanges.length > 0) {
          changes.has_changes = true;
          changes.items_modified.push({
            title: newItem.title,
            changes: itemChanges
          });
          console.log('✏️ Item modified:', newItem.title, '(ID:', newItem.id, ')', itemChanges.length, 'changes');
        }
        
        // Remove from map so we can detect additions later
        newItemsById.delete(oldItem.id);
      }
    });

    // Any items left in newItemsById are NEW (don't exist in old items)
    if (newItemsById.size > 0) {
      newItemsById.forEach((newItem) => {
        changes.has_changes = true;
        changes.items_added.push({
          title: newItem.title,
          order_index: newItem.order_index
        });
        console.log('➕ Item added:', newItem.title);
      });
    }

    console.log('✅ Comparison complete:', {
      removed: changes.items_removed.length,
      added: changes.items_added.length,
      modified: changes.items_modified.length
    });

    return changes;
  }

  private generateItemKey(item: any): string {
    // Use title + order_index as unique key
    return `${item.title}_${item.order_index}`;
  }

  private compareItems(oldItem: any, newItem: any): any[] {
    const itemChanges = [];
    // Compare fields that represent content or order changes
    const fieldsToCheck = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'is_required', label: 'Required' },
      { key: 'sample_image_url', label: 'Sample Image' },
      { key: 'sample_images', label: 'Sample & Reference Images' }, // Track all images (primary + references)
      { key: 'photo_requirements', label: 'Photo Requirements' },
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
    return images.map(img => ({
      url: img.url,
      label: img.label || '',
      description: img.description || '',
      type: img.type || 'photo',
      image_type: img.image_type || 'sample',
      is_primary: !!img.is_primary,
      order_index: img.order_index || 0
    }));
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

  private proceedWithSave(templateData: any, createVersion: boolean, changes?: any, revisionDescription?: string, versionNotes?: string): void {
    this.saving = true;

    // When creating a new version
    if (createVersion && this.editingTemplate) {
      // Increment the version for the new template
      const currentVersion = this.editingTemplate.version || '1.0';
      const newVersion = this.getNextVersion(currentVersion);
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
      
      console.log(`Creating new version: ${newVersion} from existing template ${this.editingTemplate.id}`);
      console.log(`source_template_id set to: ${templateData.source_template_id}`);
      console.log(`Cleaned name from "${this.editingTemplate.name}" to "${templateData.name}"`);
    } else if (this.editingTemplate) {
      // Updating current version - use updateTemplate instead
      console.log(`Updating current version: ${this.editingTemplate.version}`);
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

