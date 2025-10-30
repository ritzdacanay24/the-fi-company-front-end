import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { UploadService } from '@app/core/api/upload/upload.service';
import { PhotoChecklistUploadService } from '@app/core/api/photo-checklist/photo-checklist-upload.service';
import { QualityDocumentSelectorComponent, QualityDocumentSelection } from '@app/shared/components/quality-document-selector/quality-document-selector.component';
import { PdfParserService } from './services/pdf-parser.service';

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
                </p>
                <p class="text-muted mb-0" *ngIf="!editingTemplate">
                  Create a new photo checklist template with customizable inspection items
                </p>
              </div>
            </div>
            
            <!-- Versioning Warning for Editing Existing Template -->
            <div class="alert alert-warning border-warning border-opacity-25 bg-warning bg-opacity-10" role="alert" *ngIf="editingTemplate">
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
                       [class.opacity-50]="item.get('level')?.value === 1"
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
                        <textarea class="form-control" formControlName="description" rows="2" placeholder="Enter item description"></textarea>
                        <div class="form-text">
                          <i class="mdi mdi-information-outline me-1"></i>
                          Detailed instructions for this inspection item.
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
                              <img [src]="getSampleImage(i)?.url"
                                   class="img-thumbnail"
                                   style="width: 80px; height: 80px; object-fit: cover; cursor: pointer;"
                                   [alt]="getSampleImage(i)?.label || 'Sample image'"
                                   (click)="previewSampleImage(i)"
                                   (error)="onSampleImageError(i)"
                                   (load)="onSampleImageLoad(i)">
                              <ng-container *ngIf="!getSampleImage(i)?.url">
                                <div class="bg-light d-flex align-items-center justify-content-center rounded" style="width: 80px; height: 80px;">
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
            <li>Upload a PDF checklist form to auto-extract items</li>
            <li>Upload a CSV file with checklist data</li>
            <li>Manually specify the number of items to create</li>
          </ul>
        </div>

        <!-- File Upload Section -->
        <div class="mb-4">
          <label class="form-label">Upload File (PDF or CSV)</label>
          <input 
            type="file" 
            class="form-control" 
            accept=".pdf,.csv"
            (change)="onImportFileSelected($event)"
            #fileInput>
          <div class="form-text">
            <i class="mdi mdi-information-outline me-1"></i>
            Supported formats: PDF (.pdf), CSV (.csv)
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
    }
    
    /* Visual feedback for hierarchy */
    .card[class*="border-primary"] {
      border-left-color: #0d6efd !important;
      background: rgba(13, 110, 253, 0.02);
    }
    
    .card[class*="ms-4"] {
      transition: margin-left 0.3s ease;
    }
  `]
})
export class ChecklistTemplateEditorComponent implements OnInit {
  @ViewChild('importModal') importModalRef!: TemplateRef<any>;
  
  templateForm: FormGroup;
  editingTemplate: ChecklistTemplate | null = null;
  saving = false;
  loading = false;
  uploadingImage = false;
  showRequirements: boolean[] = [];
  selectedQualityDocument: QualityDocumentSelection | null = null;
  
  // Import functionality
  importing = false;
  importError: string | null = null;
  importManualName = '';
  importManualItemCount = 5;
  
  // Sample image management - single image per item
  sampleImages: { [itemIndex: number]: SampleImage | null } = {};

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
    private pdfParser: PdfParserService
  ) {
    this.templateForm = this.createTemplateForm();
  }

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.loadTemplate(parseInt(templateId));
    }
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
              console.log(`Loaded sample image URL for item ${index}:`, item.sample_image_url);
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
              console.log(`Loaded sample image URL for item ${index}:`, item.sample_images[0].url);
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
    
    // Check if item has sample_images array (from PDF import)
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
  }

  addItem(): void {
    this.items.push(this.createItemFormGroup());
    this.showRequirements.push(false);
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
    
    // Create new sub-item
    const subItem = this.fb.group({
      title: [`Sub-item ${childCount + 1}`, Validators.required],
      description: [''],
      order_index: [parentOrderIndex + ((childCount + 1) * 0.1)], // e.g., 5.1, 5.2, 5.3
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
        max_photos: [1]
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
    
    console.log(`✓ Added sub-item at index ${insertIndex} under parent ${parentIndex}`);
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

  dropItem(event: CdkDragDrop<string[]>): void {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    
    if (previousIndex === currentIndex) {
      return; // No change
    }
    
    const movedItem = this.items.at(previousIndex);
    const movedLevel = movedItem.get('level')?.value || 0;
    const movedParentId = movedItem.get('parent_id')?.value;
    
    // Move the item in the array
    moveItemInArray(this.items.controls, previousIndex, currentIndex);
    moveItemInArray(this.showRequirements, previousIndex, currentIndex);
    
    // If moving a child item, check if it should be re-parented
    if (movedLevel === 1) {
      // Find what item is now above and below the dropped position
      const itemAbove = currentIndex > 0 ? this.items.at(currentIndex - 1) : null;
      const itemBelow = currentIndex < this.items.length - 1 ? this.items.at(currentIndex + 1) : null;
      
      const aboveLevel = itemAbove?.get('level')?.value || 0;
      const belowLevel = itemBelow?.get('level')?.value || 0;
      const aboveParentId = itemAbove?.get('parent_id')?.value;
      const aboveOrderIndex = itemAbove?.get('order_index')?.value;
      
      // Determine the new parent
      let newParentId = movedParentId;
      
      if (aboveLevel === 0) {
        // Dropped right after a parent item - become its child
        newParentId = Math.floor(aboveOrderIndex);
      } else if (aboveLevel === 1) {
        // Dropped after another child - use its parent
        newParentId = aboveParentId;
      } else if (itemAbove === null && belowLevel === 0) {
        // Dropped at the top, before a parent - convert to parent
        movedItem.get('level')?.setValue(0);
        movedItem.get('parent_id')?.setValue(null);
      }
      
      // Update parent if it changed
      if (newParentId !== movedParentId) {
        movedItem.get('parent_id')?.setValue(newParentId);
      }
    }
    
    // If moving a parent item, also move all its children
    if (movedLevel === 0) {
      const movedOrderIndex = Math.floor(movedItem.get('order_index')?.value || 0);
      const children: number[] = [];
      
      // Find all children of the moved parent
      this.items.controls.forEach((item, index) => {
        if (item.get('parent_id')?.value === movedOrderIndex && index !== currentIndex) {
          children.push(index);
        }
      });
      
      // Move children to be right after their parent
      if (children.length > 0) {
        // Sort children by their current position (descending to avoid index issues)
        children.sort((a, b) => b - a);
        
        let insertPosition = currentIndex + 1;
        children.reverse().forEach(childIndex => {
          if (childIndex > currentIndex) {
            // Child was after parent, adjust index
            moveItemInArray(this.items.controls, childIndex, insertPosition);
            moveItemInArray(this.showRequirements, childIndex, insertPosition);
          } else {
            // Child was before parent
            moveItemInArray(this.items.controls, childIndex, insertPosition);
            moveItemInArray(this.showRequirements, childIndex, insertPosition);
            insertPosition++;
          }
        });
      }
    }
    
    // Recalculate order_index for all items to maintain proper sequence
    this.recalculateOrderIndices();
  }
  
  /**
   * Recalculate order_index for all items based on their position and hierarchy
   */
  private recalculateOrderIndices(): void {
    let currentParentIndex = 1;
    let childCounter = 0;
    let lastParentId: number | null = null;
    
    this.items.controls.forEach((control, index) => {
      const level = control.get('level')?.value || 0;
      const parentId = control.get('parent_id')?.value;
      
      if (level === 0) {
        // Parent item - whole number
        control.get('order_index')?.setValue(currentParentIndex);
        currentParentIndex++;
        childCounter = 0;
        lastParentId = currentParentIndex - 1;
      } else {
        // Child item - decimal
        if (parentId !== lastParentId) {
          // Parent changed, reset child counter
          childCounter = 0;
          lastParentId = parentId;
        }
        childCounter++;
        const orderIndex = parentId + (childCounter / 10);
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
    
    console.log(`Promoted item ${index} to parent`);
  }

  onQualityDocumentSelected(document: QualityDocumentSelection | null): void {
    this.selectedQualityDocument = document;
    // Update the form control with the selected document ID
    this.templateForm.get('quality_document_id')?.setValue(document?.documentId || null);
    console.log('Quality document selected:', document);
  }

  getSampleImage(itemIndex: number): SampleImage | null {
    return this.sampleImages[itemIndex] || null;
  }

  hasSampleImage(itemIndex: number): boolean {
    return this.sampleImages[itemIndex] != null;
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

  previewSampleImage(itemIndex: number): void {
    // TODO: Implement image preview
    console.log('Preview image for item', itemIndex);
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
    console.log('Image load error for item', itemIndex);
  }

  onSampleImageLoad(itemIndex: number): void {
    // Handle image load success
    console.log('Image loaded successfully for item', itemIndex);
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
    
    templateData.items = templateData.items.map((item: any, index: number) => {
      console.log(`Item ${index} sample image URL:`, {
        title: item.title,
        sample_image_url: item.sample_image_url,
        has_sample_image: !!item.sample_image_url
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

    // Add timeout to prevent indefinite hanging
    const saveRequest = this.editingTemplate 
      ? this.configService.updateTemplate(this.editingTemplate.id, templateData)
      : this.configService.createTemplate(templateData);

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
        
        // Show success message and stay on current page for edits
        if (this.editingTemplate) {
          alert('Template updated successfully!');
          // Optionally reload the template to reflect any server-side changes
          // this.loadTemplate(this.editingTemplate.id);
        } else {
          // For new templates, navigate to template manager
          this.router.navigate(['/quality/template-manager']);
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
    this.router.navigate(['/quality/template-manager']);
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

      if (file.name.toLowerCase().endsWith('.pdf')) {
        parsedTemplate = await this.pdfParser.parsePdfToTemplate(file);
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        parsedTemplate = await this.pdfParser.parseCsvToTemplate(file);
      } else {
        throw new Error('Unsupported file format. Please upload a PDF or CSV file.');
      }

      // Populate the form with parsed data
      this.populateFormFromImport(parsedTemplate);
      
      // Close modal
      this.modalService.dismissAll();
      
      alert(`Successfully imported ${parsedTemplate.items.length} items from ${file.name}`);
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
    
    alert(`Successfully created template with ${parsedTemplate.items.length} items`);
  }

  private populateFormFromImport(parsedTemplate: any): void {
    console.log('🔍 populateFormFromImport called with:', parsedTemplate);
    
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

    // Add all items (recursively process children if present)
    parsedTemplate.items.forEach((item: any, index: number) => {
      this.addItemToForm(item, index);
      
      // Process children if present
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        console.log(`   📂 Item ${index + 1} has ${item.children.length} children - processing...`);
        item.children.forEach((childItem: any, childIndex: number) => {
          const childFormIndex = this.items.length;
          this.addItemToForm(childItem, childFormIndex, item.order_index);
        });
      }
    });

    // Initialize showRequirements array
    this.showRequirements = new Array(this.items.length).fill(false);

    console.log('\n📊 Import Summary:');
    console.log('   - Total items:', this.items.length);
    console.log('   - Sample images dictionary:', this.sampleImages);
    console.log('   - Sample images count:', Object.keys(this.sampleImages).length);
    console.log('   - Form value:', this.templateForm.value);
    
    // Trigger change detection to update UI
    this.cdr.detectChanges();
    console.log('✓ Change detection triggered');
  }
}

