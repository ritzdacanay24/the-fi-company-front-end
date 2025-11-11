import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { UploadService } from '@app/core/api/upload/upload.service';
import { PhotoChecklistUploadService } from '@app/core/api/photo-checklist/photo-checklist-upload.service';
import { QualityDocumentSelectorComponent, QualityDocumentSelection } from '@app/shared/components/quality-document-selector/quality-document-selector.component';
import { PdfParserService } from './services/pdf-parser.service';
import { WordParserService } from './services/word-parser.service';

interface SampleImage {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'photo' | 'drawing' | 'bom' | 'schematic' | 'reference' | 'diagram';
  is_primary: boolean;
  order_index: number;
  status?: 'loading' | 'loaded' | 'error';
}

@Component({
  selector: 'app-checklist-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, DragDropModule, QualityDocumentSelectorComponent, RouterModule],
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
                    <textarea class="form-control" formControlName="description" rows="3" placeholder="Enter template description"></textarea>
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
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label mb-0">Description</label>
                          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="toggleDescriptionPreview(i)">
                            <i class="mdi" [class.mdi-eye]="!showDescriptionPreview[i]" [class.mdi-code-tags]="showDescriptionPreview[i]"></i>
                            {{showDescriptionPreview[i] ? 'Edit HTML' : 'Preview'}}
                          </button>
                        </div>
                        <textarea 
                          *ngIf="!showDescriptionPreview[i]"
                          class="form-control" 
                          formControlName="description" 
                          rows="4" 
                          placeholder="Enter item description (HTML supported)"></textarea>
                        <div 
                          *ngIf="showDescriptionPreview[i]"
                          class="border rounded p-3 bg-light"
                          style="min-height: 100px;"
                          [innerHTML]="item.get('description')?.value || ''"></div>
                        <div class="form-text">
                          <i class="mdi mdi-information-outline me-1"></i>
                          Detailed instructions for this inspection item. HTML formatting is preserved from Word import.
                        </div>
                      </div>

                      <!-- Photo Requirements -->
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label mb-0">Photo Requirements</label>
                          <button type="button" class="btn  btn-outline-primary" (click)="toggleRequirements(i)">
                            <i class="mdi" [class.mdi-chevron-down]="!showRequirements[i]" [class.mdi-chevron-up]="showRequirements[i]"></i>
                            {{showRequirements[i] ? 'Hide' : 'Show'}} Requirements
                          </button>
                        </div>

                        <div *ngIf="showRequirements[i]" class="border rounded p-3 bg-light">
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
                            </div>
                          </div>
                        </div>

                        <!-- Sample Images -->
                        <div class="mb-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <label class="form-label mb-0">Sample Image</label>
                            <button type="button" class="btn  btn-outline-primary" 
                                    (click)="openSampleImageUpload(i)"
                                    [disabled]="uploadingImage">
                              <span *ngIf="uploadingImage" class="spinner-border spinner-border-sm me-1" role="status"></span>
                              <i *ngIf="!uploadingImage" class="mdi" [class.mdi-plus]="!hasSampleImage(i)" [class.mdi-image-edit]="hasSampleImage(i)"></i>
                              {{uploadingImage ? 'Uploading...' : (hasSampleImage(i) ? 'Replace Image' : 'Add Sample Image')}}
                            </button>
                          </div>
                          
                          <div *ngIf="hasSampleImage(i)" class="d-flex align-items-center">
                            <div class="position-relative me-3">
                              <img [src]="getSafeImageUrl(i)"
                                   class="img-thumbnail"
                                   style="width: 120px; height: 120px; object-fit: contain; cursor: pointer; background: white;"
                                   [alt]="getSampleImage(i)?.label || 'Sample image'"
                                   (click)="previewSampleImage(i)"
                                   (error)="onSampleImageError(i)"
                                   (load)="onSampleImageLoad(i)">
                              <ng-container *ngIf="!getSampleImage(i)?.url">
                                <div class="bg-light d-flex align-items-center justify-content-center rounded" style="width: 120px; height: 120px;">
                                  <i class="mdi mdi-image-off text-muted" style="font-size: 2rem;"></i>
                                </div>
                              </ng-container>
                              <button type="button"
                                      class="btn  btn-danger position-absolute top-0 end-0"
                                      style="transform: translate(50%, -50%); width: 20px; height: 20px; padding: 0; border-radius: 50%;"
                                      (click)="removeSampleImage(i)">
                                <i class="mdi mdi-close" style="font-size: 0.7rem;"></i>
                              </button>
                            </div>
                            <div>
                              <small class="text-muted">{{getSampleImage(i)?.label || 'Sample Image'}}</small>
                              <span *ngIf="!getSampleImage(i)?.url" class="text-danger ms-2">Image not available</span>
                            </div>
                          </div>
                          
                          <div *ngIf="!hasSampleImage(i)" class="text-muted text-center py-3 border rounded bg-light">
                            <i class="mdi mdi-image-outline mb-2" style="font-size: 2rem;"></i>
                            <p class="mb-0">No sample image added</p>
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
  showRequirements: boolean[] = [];
  showDescriptionPreview: boolean[] = [];
  selectedQualityDocument: QualityDocumentSelection | null = null;
  
  // Import functionality
  importing = false;
  importError: string | null = null;
  importManualName = '';
  importManualItemCount = 5;
  
  // Sample image management - single image per item
  sampleImages: { [itemIndex: number]: SampleImage | null } = {};
  
  // Image preview
  previewImageUrl: string | null = null;
  
  // Auto-save functionality
  autoSaveEnabled = false;
  lastSavedAt: Date | null = null;
  private autoSaveTimeout: any = null;

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
      product_type: template.product_type,
      is_active: template.is_active,
      quality_document_id: template.quality_document_metadata?.document_id || null
    });

    console.log('Loaded template data:', {
      category: template.category,
      quality_document_metadata: template.quality_document_metadata,
      form_category: this.templateForm.get('category')?.value
    });

    // Clear existing items and sample images
    while (this.items.length) {
      this.items.removeAt(0);
    }
    this.sampleImages = {};

    // Add template items and their sample images
    if (template.items) {
      template.items.forEach((item, index) => {
        this.items.push(this.createItemFormGroup(item));
        this.showRequirements[index] = false;
        this.showDescriptionPreview[index] = true; // Default to preview mode
        
        // Load sample image if it exists - check both new and old formats
        if (item.sample_image_url) {
          // New format: direct URL
          this.sampleImages[index] = {
            id: `loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: item.sample_image_url,
            label: 'Sample Image',
            description: '',
            type: 'photo',
            is_primary: true,
            order_index: 0,
            status: 'loaded' as const
          };
          
          // Update the form control with the loaded sample image URL
          const itemFormGroup = this.items.at(index) as FormGroup;
          if (itemFormGroup) {
            const sampleImageControl = itemFormGroup.get('sample_image_url');
            if (sampleImageControl) {
              sampleImageControl.setValue(item.sample_image_url);
            }
          }
        } else if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
          // Old format: array of images (backward compatibility)
          this.sampleImages[index] = {
            id: `loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: item.sample_images[0].url,
            label: item.sample_images[0].label || 'Sample Image',
            description: item.sample_images[0].description || '',
            type: item.sample_images[0].type || 'photo',
            is_primary: true,
            order_index: 0,
            status: 'loaded' as const
          };
          
          // Update the form control with the loaded sample image URL
          const itemFormGroup = this.items.at(index) as FormGroup;
          if (itemFormGroup) {
            const sampleImageControl = itemFormGroup.get('sample_image_url');
            if (sampleImageControl) {
              sampleImageControl.setValue(item.sample_images[0].url);
            }
          }
        }
      });
    }
  }

  createItemFormGroup(item?: ChecklistItem): FormGroup {
    return this.fb.group({
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
        max_photos: [item?.photo_requirements?.max_photos || null]
      }),
      sample_image_url: [item?.sample_image_url || item?.sample_images?.[0]?.url || null], // Use sample_image_url or first sample_images URL
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
    
    // Check if item has sample_images array (from PDF/Word import)
    if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
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
        max_photos: item.photo_requirements?.max_photos || 5
      }
    });
    
    this.items.push(itemGroup);
    
    // Default to showing preview for descriptions (especially for imported items with HTML)
    this.showDescriptionPreview[formIndex] = true;
  }

  addItem(): void {
    const newIndex = this.items.length;
    this.items.push(this.createItemFormGroup());
    this.showRequirements.push(false);
    this.showDescriptionPreview.push(true); // Default to preview mode
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
      level: [1], // Child level
      parent_id: [parentOrderIndex],
      photo_requirements: this.fb.group({
        angle: [''],
        distance: [''],
        lighting: [''],
        focus: [''],
        min_photos: [1],
        max_photos: [5]
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
    this.showRequirements.splice(insertIndex, 0, false);
    this.showDescriptionPreview.splice(insertIndex, 0, true); // Default to preview mode
    
    console.log(`✓ Added sub-item at index ${insertIndex} under parent ${parentIndex}`);
    console.log(`  - Title: ${subItem.get('title')?.value}`);
    console.log(`  - Order Index: ${newOrderIndex}`);
    console.log(`  - Parent ID: ${parentOrderIndex}`);
    console.log(`  - Level: 1`);
    
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
        this.showRequirements.splice(childIndex, 1);
        delete this.sampleImages[childIndex];
      });
      
      console.log(`✓ Removed ${childIndicesToRemove.length} child items`);
    }
    
    // Remove the item itself
    this.items.removeAt(index);
    this.showRequirements.splice(index, 1);
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

  toggleRequirements(index: number): void {
    this.showRequirements[index] = !this.showRequirements[index];
  }

  toggleDescriptionPreview(index: number): void {
    this.showDescriptionPreview[index] = !this.showDescriptionPreview[index];
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
    
    // Debug: Log the item being moved
    console.log('🔄 Moving item:', {
      from: previousIndex,
      to: currentIndex,
      title: movedItem.get('title')?.value,
      description: movedItem.get('description')?.value,
      level: movedLevel
    });
    
    // Move the item in the array
    moveItemInArray(this.items.controls, previousIndex, currentIndex);
    moveItemInArray(this.showRequirements, previousIndex, currentIndex);
    
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
      // Dropped at the very top - convert to parent
      movedItem.get('level')?.setValue(0);
      movedItem.get('parent_id')?.setValue(null);
      console.log('✓ Dropped at top - converted to parent');
    } else if (aboveLevel === 0 && (belowLevel === 1 || itemBelow === null)) {
      // Dropped right after a parent (and before its children or end of list) - become its child
      const newParentId = Math.floor(aboveOrderIndex);
      movedItem.get('level')?.setValue(1);
      movedItem.get('parent_id')?.setValue(newParentId);
      console.log(`✓ Dropped after parent ${newParentId} - became its child`);
    } else if (aboveLevel === 1) {
      // Dropped after another child - adopt the same parent
      movedItem.get('level')?.setValue(1);
      movedItem.get('parent_id')?.setValue(aboveParentId);
      console.log(`✓ Dropped after child - adopted parent ${aboveParentId}`);
    } else if (aboveLevel === 0 && belowLevel === 0) {
      // Dropped between two parents - become a parent
      movedItem.get('level')?.setValue(0);
      movedItem.get('parent_id')?.setValue(null);
      console.log('✓ Dropped between parents - converted to parent');
    }
    
    // Debug: Verify item data after re-parenting
    console.log('✓ After re-parenting:', {
      title: movedItem.get('title')?.value,
      description: movedItem.get('description')?.value,
      level: movedItem.get('level')?.value,
      parent_id: movedItem.get('parent_id')?.value
    });
    
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
            moveItemInArray(this.showRequirements, currentChildIndex, targetIndex);
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
        console.log(`📍 Parent item ${index} → order_index: ${currentParentIndex - 1}`);
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
        
        console.log(`  📎 Child item ${index} → parent: ${parentOrderIndex}, order_index: ${orderIndex.toFixed(1)}`);
      }
    });
    
    console.log('✓ Order indices recalculated');
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
    
    console.log(`Promoted item ${index} to parent`);
  }

  onQualityDocumentSelected(document: QualityDocumentSelection | null): void {
    this.selectedQualityDocument = document;
    // Update the form control with the selected document ID
    this.templateForm.get('quality_document_id')?.setValue(document?.documentId || null);
    console.log('Quality document selected:', document);
  }

  getSampleImage(itemIndex: number): SampleImage | null {
    const sampleImage = this.sampleImages[itemIndex] || null;
    
    // Convert relative URLs to absolute URLs (but skip data URLs)
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
    const sampleImage = this.getSampleImage(itemIndex);
    if (sampleImage?.url) {
      this.previewImageUrl = sampleImage.url;
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

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const templateData = this.templateForm.value;

    console.log('Raw template form value:', templateData);
    console.log('Selected quality document:', this.selectedQualityDocument);
    
    // Note: Quality document relationship is handled separately from template creation
    // Remove the form control field since it's not part of the database schema
    delete templateData.quality_document_id;
    
    // Log each item to debug sub-item data
    templateData.items = templateData.items.map((item: any, index: number) => {
      console.log(`Item ${index}:`, {
        title: item.title,
        description: item.description,
        order_index: item.order_index,
        level: item.level,
        parent_id: item.parent_id,
        is_required: item.is_required,
        sample_image_url: item.sample_image_url,
        has_photo_requirements: !!item.photo_requirements
      });
      
      return item; // No transformation needed now
    });

    console.log('Template data before save (matching database schema):', {
      name: templateData.name,
      description: templateData.description,
      part_number: templateData.part_number,
      product_type: templateData.product_type,
      category: templateData.category,
      is_active: templateData.is_active,
      items_count: templateData.items?.length || 0
    });

    console.log('Final template data to save:', templateData);
    console.log('Exact JSON payload being sent:', JSON.stringify(templateData, null, 2));

    // When editing a template, create a new version instead of updating
    if (this.editingTemplate) {
      // Increment the version for the new template
      const currentVersion = this.editingTemplate.version || '1.0';
      const newVersion = this.getNextVersion(currentVersion);
      templateData.version = newVersion;
      
      // IMPORTANT: Pass the source template ID to maintain parent/group relationships
      templateData.source_template_id = this.editingTemplate.id;
      
      // Clean the name - remove any existing version suffixes before adding the new one
      let cleanName = templateData.name;
      // Remove all version patterns like (v1.0), (v1.1), etc.
      cleanName = cleanName.replace(/\s*\(v\d+\.\d+\)\s*/g, '').trim();
      // Add the new version
      templateData.name = `${cleanName} (v${newVersion})`;
      
      console.log(`Creating new version: ${newVersion} from existing template ${this.editingTemplate.id}`);
      console.log(`source_template_id set to: ${templateData.source_template_id}`);
      console.log(`Cleaned name from "${this.editingTemplate.name}" to "${templateData.name}"`);
    }

    // Always use createTemplate to create a new version
    const saveRequest = this.configService.createTemplate(templateData);

    // Add timeout wrapper
    const timeoutId = setTimeout(() => {
      console.error('Save operation timed out after 30 seconds');
      this.saving = false;
      alert('Save operation timed out. Please try again.');
    }, 30000);

    saveRequest.subscribe({
      next: (response) => {
        clearTimeout(timeoutId);
        console.log('Template saved successfully:', response);
        this.saving = false;
        
        // Show success message
        if (this.editingTemplate) {
          const newVersion = this.getNextVersion(this.editingTemplate.version || '1.0');
          alert(`New version (v${newVersion}) created successfully!`);
          // Navigate back to template manager to see the new version
          this.router.navigate(['/quality/checklist/template-manager']);
        } else {
          // For new templates, navigate to template manager
          alert('Template created successfully!');
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
      is_active: true
    });
    
    console.log('✓ Basic template info populated');
    console.log('   - Form items array length BEFORE adding:', this.items.length);

    // Add all items (recursively process children if present)
    if (parsedTemplate.items && Array.isArray(parsedTemplate.items)) {
      console.log(`📝 Processing ${parsedTemplate.items.length} items...`);
      parsedTemplate.items.forEach((item: any, index: number) => {
        console.log(`   Adding item ${index + 1}: ${item.title}`);
        this.addItemToForm(item, index);
        
        // Process children if present
        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
          console.log(`   📂 Item ${index + 1} has ${item.children.length} children - processing...`);
          item.children.forEach((childItem: any, childIndex: number) => {
            const childFormIndex = this.items.length;
            console.log(`      Adding child item: ${childItem.title}`);
            this.addItemToForm(childItem, childFormIndex, item.order_index);
          });
        }
      });
    } else {
      console.warn('⚠️ No items array found in parsedTemplate!');
    }

    // Initialize showRequirements array
    this.showRequirements = new Array(this.items.length).fill(false);
    
    // Trigger change detection to update UI
    this.cdr.detectChanges();
  }
}

