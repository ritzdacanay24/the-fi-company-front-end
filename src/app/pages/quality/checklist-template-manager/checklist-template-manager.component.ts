import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { UploadService } from '@app/core/api/upload/upload.service';
import { PhotoChecklistUploadService } from '@app/core/api/photo-checklist/photo-checklist-upload.service';
import { QualityDocumentSelectorComponent, QualityDocumentSelection } from '@app/shared/components/quality-document-selector/quality-document-selector.component';

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
  selector: 'app-checklist-template-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, DragDropModule, QualityDocumentSelectorComponent],
  template: `
    <div class="container-fluid">
      <div class="row justify-content-center">
        <div class="col-12">
          
          <!-- Breadcrumb -->
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <a href="#" class="text-decoration-none" (click)="$event.preventDefault()">
                  <i class="mdi mdi-home-outline me-1"></i>Quality
                </a>
              </li>
              <li class="breadcrumb-item active" aria-current="page">
                Template Manager
              </li>
            </ol>
          </nav>
          
          <!-- Page Header with Context -->
          <div class="mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center">
                <div class="bg-primary bg-gradient rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                  <i class="mdi mdi-clipboard-text text-white fs-4"></i>
                </div>
                <div>
                  <h2 class="mb-1 text-primary">Template Manager</h2>
                  <p class="text-muted mb-0">Create and manage photo checklist templates</p>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button 
                  type="button" 
                  class="btn btn-primary"
                  (click)="createNewTemplate()"
                  title="Create new checklist template">
                  <i class="mdi mdi-plus me-2"></i>New Template
                </button>
              </div>
            </div>
            
            <div class="alert alert-primary border-primary border-opacity-25 bg-primary bg-opacity-10" role="alert">
              <div class="d-flex align-items-start">
                <i class="mdi mdi-information text-primary me-3 mt-1 fs-5"></i>
                <div>
                  <h6 class="alert-heading text-primary mb-2">Template Manager Overview</h6>
                  <p class="mb-0">
                    Create and manage <strong>photo checklist templates</strong> for quality control processes. 
                    Each template defines required photos, inspection points, and documentation standards.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="card shadow-sm border-0">
            <div class="card-header">
              <div class="d-flex align-items-center flex-wrap gap-3">
                <div class="form-icon">
                  <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center">
                      <label class="form-label mb-0 me-2 fw-semibold">Search:</label>
                      <div class="input-group" style="min-width: 300px;">
                        <input type="text" class="form-control" [(ngModel)]="templateSearch" 
                               placeholder="Search templates..."
                               (ngModelChange)="onTemplateSearch()">
                        <button class="btn btn-outline-secondary" type="button" 
                                *ngIf="templateSearch" (click)="clearTemplateSearch()">
                          <i class="mdi mdi-close"></i>
                        </button>
                      </div>
                    </div>
                    
                    <select class="form-select" [(ngModel)]="templateFilters.category" (change)="onTemplateSearch()" style="min-width: 150px;">
                      <option value="">All Categories</option>
                      <option value="assembly">Assembly</option>
                      <option value="inspection">Inspection</option>
                      <option value="testing">Testing</option>
                      <option value="packaging">Packaging</option>
                      <option value="shipping">Shipping</option>
                      <option value="quality_control">Quality Control</option>
                    </select>
                    
                    <select class="form-select" [(ngModel)]="templateFilters.activeOnly" (change)="onTemplateSearch()" style="min-width: 130px;">
                      <option [ngValue]="null">All Status</option>
                      <option [ngValue]="true">Active Only</option>
                      <option [ngValue]="false">Inactive Only</option>
                    </select>
                  </div>
                </div>
                
                <button class="btn btn-outline-secondary" (click)="loadTemplates()" title="Refresh data">
                  <i class="mdi mdi-refresh me-1"></i>Refresh
                </button>
                
                <div class="ms-auto">
                  <div class="d-flex align-items-center">
                    <div class="me-4 d-flex gap-4 small text-muted">
                      <span>
                        <i class="mdi mdi-database text-info me-1"></i>
                        <strong>{{templates?.length || 0}}</strong> Total
                      </span>
                      <span>
                        <i class="mdi mdi-check-circle text-success me-1"></i>
                        <strong>{{getActiveTemplatesCount()}}</strong> Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="card-body p-0">
              <ng-container *ngIf="getFilteredTemplates()?.length; else noRecords">
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr>
                        <th style="width: 120px;">Actions</th>
                        <th>Template Name</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Part Number</th>
                        <th>Items</th>
                        <th>Version</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let template of getFilteredTemplates(); trackBy: trackByTemplateId" 
                          class="align-middle">
                        <td>
                          <div class="d-flex gap-1 align-items-center justify-content-center">
                            <button class="btn btn-sm btn-outline-primary" 
                                    (click)="viewTemplate(template)"
                                    title="View Template">
                              <i class="mdi mdi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" 
                                    (click)="editTemplate(template)"
                                    title="Edit Template">
                              <i class="mdi mdi-pencil"></i>
                            </button>
                          </div>
                        </td>
                        <td>
                          <div class="fw-semibold">{{template.name}}</div>
                        </td>
                        <td>
                          <span class="badge bg-primary">{{template.category | titlecase}}</span>
                        </td>
                        <td>
                          <span class="text-muted">{{template.description || 'No description available'}}</span>
                        </td>
                        <td>
                          <code *ngIf="template.part_number">{{template.part_number}}</code>
                          <span class="text-muted" *ngIf="!template.part_number">-</span>
                        </td>
                        <td>
                          <div class="text-center">
                            <div class="fw-semibold">{{template.item_count || 0}}</div>
                            <small class="text-muted">items</small>
                          </div>
                        </td>
                        <td>
                          <span class="badge bg-secondary">v{{template.version}}</span>
                        </td>
                        <td>
                          <span class="badge" [class]="template.is_active ? 'bg-success' : 'bg-danger'">
                            {{template.is_active ? 'Active' : 'Inactive'}}
                          </span>
                        </td>
                        <td>
                          <small class="text-muted">
                            {{template.created_at | date:'MMM d, y'}}
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ng-container>
              <ng-template #noRecords>
                <div class="d-flex flex-column align-items-center justify-content-center p-5">
                  <div class="text-center" style="max-width: 500px;">
                    <div class="mb-4">
                      <div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width: 120px; height: 120px;">
                        <i class="mdi mdi-clipboard-text text-primary" style="font-size: 3rem;"></i>
                      </div>
                    </div>
                    <h4 class="text-body-emphasis mb-3">No Templates Found</h4>
                    <p class="text-muted mb-4">
                      No templates match your current filters. Try adjusting your criteria or create a new template.
                    </p>
                    <button 
                      type="button" 
                      class="btn btn-primary"
                      (click)="createNewTemplate()">
                      <i class="mdi mdi-plus me-2"></i>Create First Template
                    </button>
                  </div>
                </div>
              </ng-template>
            </div>
            
            <div class="card-footer bg-light text-muted d-flex align-items-center">
              <i class="mdi mdi-information me-2"></i>
              <span>Click "View" to preview templates or "Edit" to modify template configurations</span>
              <div class="ms-auto">
                <small>Total: {{getFilteredTemplates()?.length || 0}} templates</small>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>    <!-- Template Editor Modal -->
    <ng-template #templateModal let-modal>
      <div class="modal-header bg-light border-bottom">
        <div class="d-flex align-items-center">
          <i class="mdi mdi-clipboard-edit text-primary me-2 fs-4"></i>
          <div>
            <h5 class="modal-title mb-0">
              {{editingTemplate ? 'Edit Template' : 'Create New Template'}}
            </h5>
            <small class="text-muted" *ngIf="editingTemplate">
              ID: {{editingTemplate.id}} | Version: {{editingTemplate.version}}
            </small>
          </div>
        </div>
        <button type="button" class="btn-close" (click)="modal.dismiss()" [attr.aria-label]="'Close'"></button>
      </div>
      
      <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
        <!-- Progress Indicator -->
        <div class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-secondary">Step 1: Basic Information</span>
            <span class="badge bg-secondary">Step 2: Checklist Items</span>
          </div>
          <div class="progress" style="height: 3px;">
            <div class="progress-bar bg-primary" 
                 [style.width.%]="items.length > 0 ? 100 : 50"></div>
          </div>
        </div>

        <!-- Warning for editing existing templates -->
        <div class="alert alert-warning d-flex align-items-start mb-4" *ngIf="editingTemplate && editingTemplate.active_instances > 0">
          <i class="mdi mdi-alert-triangle me-2 mt-1"></i>
          <div>
            <strong>⚠️ Active Template Warning:</strong> 
            This template has {{editingTemplate.active_instances}} active instance{{editingTemplate.active_instances !== 1 ? 's' : ''}} with existing photo submissions.
            <div class="mt-2">
              <small class="text-muted">
                <strong>Recommendation:</strong> Create a new revision (v{{getNextRevision(editingTemplate.version)}}) instead of modifying this version to preserve data integrity.
              </small>
            </div>
          </div>
        </div>

        <!-- Version Control Options -->
        <div class="card border-info mb-4" *ngIf="editingTemplate && editingTemplate.active_instances > 0">
          <div class="card-header bg-info text-white py-2">
            <h6 class="mb-0">
              <i class="mdi mdi-source-branch me-2"></i>
              Version Control Options
            </h6>
          </div>
          <div class="card-body p-3">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="card border h-100">
                  <div class="card-body text-center p-3">
                    <i class="mdi mdi-pencil text-warning mb-2" style="font-size: 2rem;"></i>
                    <h6 class="text-warning">Update Current</h6>
                    <p class="small text-muted mb-2">Modify v{{editingTemplate.version}} in-place</p>
                    <button type="button" class="btn btn-outline-warning btn-sm" 
                            (click)="prepareForceUpdate()"
                            title="Requires administrator approval">
                      <i class="mdi mdi-alert me-1"></i>
                      Risky Update
                    </button>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card border-success h-100">
                  <div class="card-body text-center p-3">
                    <i class="mdi mdi-source-branch text-success mb-2" style="font-size: 2rem;"></i>
                    <h6 class="text-success">Create Revision</h6>
                    <p class="small text-muted mb-2">New version v{{getNextRevision(editingTemplate.version)}}</p>
                    <button type="button" class="btn btn-success btn-sm" 
                            (click)="prepareNewRevision()">
                      <i class="mdi mdi-check me-1"></i>
                      Recommended
                    </button>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card border h-100">
                  <div class="card-body text-center p-3">
                    <i class="mdi mdi-rocket text-primary mb-2" style="font-size: 2rem;"></i>
                    <h6 class="text-primary">Major Version</h6>
                    <p class="small text-muted mb-2">New series v{{getNextMajorVersion(editingTemplate.version)}}</p>
                    <button type="button" class="btn btn-outline-primary btn-sm" 
                            (click)="prepareMajorVersion()">
                      <i class="mdi mdi-rocket me-1"></i>
                      Big Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()"
              class="needs-validation" [class.was-validated]="templateForm.touched">
          <!-- Basic Information Section -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-primary text-white py-2">
              <h6 class="mb-0">
                <i class="mdi mdi-information-outline me-2"></i>
                Basic Information
              </h6>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-md-8">
                  <label class="form-label fw-bold">Template Name *</label>
                  <input type="text" 
                         class="form-control" 
                         formControlName="name"
                         placeholder="e.g., IGT Video Wall QC Checklist"
                         [class.is-invalid]="templateForm.get('name')?.invalid && templateForm.get('name')?.touched">
                  <div class="invalid-feedback">
                    Template name is required
                  </div>
                </div>
              </div>

              <!-- Quality Document Reference -->
              <div class="mb-3">
                <app-quality-document-selector
                  formControlName="quality_document"
                  label="Quality Document Reference"
                  placeholder="Select a quality document to link this template to..."
                  helpText="Link this checklist template to a quality document for version control and traceability"
                  [showOnlyApproved]="false"
                  [showTypeFilter]="true"
                  (selectionChange)="onQualityDocumentSelected($event)">
                </app-quality-document-selector>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Description</label>
                <textarea class="form-control" 
                          rows="3" 
                          formControlName="description"
                          placeholder="Describe what this checklist is used for, when it should be applied, and any special instructions..."></textarea>
                <small class="text-muted">Provide clear instructions for when and how to use this template</small>
              </div>

              <div class="row">
                <div class="col-md-4">
                  <label class="form-label fw-bold">Part Number</label>
                  <input type="text" 
                         class="form-control" 
                         formControlName="part_number"
                         placeholder="VWL-03513">
                  <small class="text-muted">Product part number</small>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-bold">Product Type</label>
                  <input type="text" 
                         class="form-control" 
                         formControlName="product_type"
                         placeholder="Video Wall">
                  <small class="text-muted">Type of product</small>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-bold">Category</label>
                  <select class="form-select" formControlName="category">
                    <option value="quality_control">Quality Control</option>
                    <option value="installation">Installation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inspection">Inspection</option>
                  </select>
                  <small class="text-muted">Checklist category</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Checklist Items Section -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header d-flex justify-content-between align-items-center bg-success text-white py-2">
              <h6 class="mb-0">
                <i class="mdi mdi-format-list-checks me-2"></i>
                Checklist Items ({{items.length}})
              </h6>
              <button type="button" 
                      class="btn btn-sm btn-light text-success fw-bold" 
                      (click)="addItem()">
                <i class="mdi mdi-plus me-1"></i>
                Add Item
              </button>
              <div class="btn-group btn-group-sm ms-2" ngbDropdown placement="bottom-right">
                <button type="button" class="btn btn-sm btn-outline-success" ngbDropdownToggle>
                  <i class="mdi mdi-lightning-bolt"></i>
                  Quick Add
                </button>
                <div class="dropdown-menu" ngbDropdownMenu>
                  <button class="dropdown-item" (click)="addQuickItem('serial')">
                    <i class="mdi mdi-barcode me-2"></i>Serial Number Photo
                  </button>
                  <button class="dropdown-item" (click)="addQuickItem('label')">
                    <i class="mdi mdi-label me-2"></i>Label/Tag Photo
                  </button>
                  <button class="dropdown-item" (click)="addQuickItem('assembly')">
                    <i class="mdi mdi-puzzle me-2"></i>Assembly Photo
                  </button>
                  <button class="dropdown-item" (click)="addQuickItem('damage')">
                    <i class="mdi mdi-alert-circle me-2"></i>Damage Inspection
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body p-3">
              <div class="alert alert-info d-flex align-items-start mb-3" *ngIf="items.length === 0">
                <i class="mdi mdi-information me-2 mt-1"></i>
                <div>
                  <strong>Getting Started:</strong> Add checklist items that define what photos need to be taken. 
                  Each item can have specific requirements for angle, distance, lighting, and focus areas.
                </div>
              </div>

              <div cdkDropList (cdkDropListDropped)="onItemDrop($event)" class="items-container">
                <div class="card mb-3 item-card position-relative" 
                     *ngFor="let item of items.controls; let i = index; trackBy: trackByIndex"
                     [formGroup]="getItemFormGroup(i)"
                     cdkDrag>
                  
                  <!-- Item Header -->
                  <div class="card-header d-flex justify-content-between align-items-center bg-light position-relative">
                    <div class="d-flex align-items-center">
                      <i class="mdi mdi-drag-vertical text-muted me-2 fs-5" cdkDragHandle style="cursor: grab;"></i>
                      <div class="item-number bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                           style="width: 28px; height: 28px; font-size: 0.875rem; font-weight: 600;">
                        {{i + 1}}
                      </div>
                      <div>
                        <strong class="text-dark">{{getItemFormGroup(i).get('title')?.value || 'New Item'}}</strong>
                        <span class="badge bg-danger ms-2" *ngIf="getItemFormGroup(i).get('is_required')?.value">Required</span>
                        <span class="badge bg-info ms-1" *ngIf="getItemFormGroup(i).get('min_photos')?.value > 0 || getItemFormGroup(i).get('max_photos')?.value">
                          <i class="mdi mdi-camera me-1"></i>
                          {{getItemFormGroup(i).get('min_photos')?.value || 0}}-{{getItemFormGroup(i).get('max_photos')?.value || '∞'}} photos
                        </span>
                        <span class="badge bg-warning ms-1" *ngIf="getItemFormGroup(i).get('title')?.invalid && getItemFormGroup(i).get('title')?.touched">
                          <i class="mdi mdi-alert-circle me-1"></i>Invalid
                        </span>
                        <span class="badge bg-danger ms-1" *ngIf="getItemFormGroup(i).hasError('photoLimitInvalid')">
                          <i class="mdi mdi-alert-circle me-1"></i>Invalid Photo Limits
                        </span>
                      </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <button type="button" 
                              class="btn btn-sm btn-outline-secondary" 
                              (click)="toggleRequirements(i)"
                              [title]="showRequirements[i] ? 'Hide Requirements' : 'Show Requirements'">
                        <i class="mdi" [class]="showRequirements[i] ? 'mdi-chevron-up' : 'mdi-chevron-down'"></i>
                      </button>
                      <button type="button" 
                              class="btn btn-sm btn-outline-danger" 
                              (click)="removeItem(i)"
                              title="Remove Item">
                        <i class="mdi mdi-delete"></i>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Item Body -->
                  <div class="card-body">
                    <div class="row">
                      <div class="col-md-8">
                        <div class="mb-3">
                          <label class="form-label fw-bold">Title *</label>
                          <input type="text" 
                                 class="form-control" 
                                 formControlName="title"
                                 placeholder="e.g., Serial Tag and UL Label Photo"
                                 [class.is-invalid]="getItemFormGroup(i).get('title')?.invalid && getItemFormGroup(i).get('title')?.touched">
                          <div class="invalid-feedback">
                            Item title is required
                          </div>
                        </div>
                      </div>
                      <div class="col-md-4">
                        <div class="mb-3">
                          <label class="form-label fw-bold">Settings</label>
                          <div class="form-check">
                            <input type="checkbox" 
                                   class="form-check-input" 
                                   formControlName="is_required"
                                   id="required_{{i}}">
                            <label class="form-check-label" [for]="'required_' + i">
                              Required Item
                            </label>
                          </div>
                          <small class="text-muted">Users must complete this item</small>
                          
                          <!-- Photo Limits Section -->
                          <div class="mt-3">
                            <label class="form-label fw-bold text-primary mb-2">
                              <i class="mdi mdi-camera-outline me-1"></i>
                              Photo Limits
                            </label>
                            <div class="row g-2">
                              <div class="col-6">
                                <label class="form-label fw-bold text-primary small">Min Photos</label>
                                <input type="number" 
                                       class="form-control form-control-sm" 
                                       formControlName="min_photos"
                                       min="0"
                                       max="50"
                                       placeholder="0"
                                       [class.is-invalid]="getItemFormGroup(i).get('min_photos')?.invalid && getItemFormGroup(i).get('min_photos')?.touched">
                                <small class="text-muted">Minimum required</small>
                                <div class="invalid-feedback" *ngIf="getItemFormGroup(i).get('min_photos')?.errors?.['min']">
                                  Must be at least 0
                                </div>
                                <div class="invalid-feedback" *ngIf="getItemFormGroup(i).get('min_photos')?.errors?.['max']">
                                  Must be at most 50
                                </div>
                              </div>
                              <div class="col-6">
                                <label class="form-label fw-bold text-primary small">Max Photos</label>
                                <input type="number" 
                                       class="form-control form-control-sm" 
                                       formControlName="max_photos"
                                       min="1"
                                       max="50"
                                       placeholder="10"
                                       [class.is-invalid]="getItemFormGroup(i).get('max_photos')?.invalid && getItemFormGroup(i).get('max_photos')?.touched || getItemFormGroup(i).hasError('photoLimitInvalid')">
                                <small class="text-muted">Maximum allowed</small>
                                <div class="invalid-feedback" *ngIf="getItemFormGroup(i).get('max_photos')?.errors?.['min']">
                                  Must be at least 1
                                </div>
                                <div class="invalid-feedback" *ngIf="getItemFormGroup(i).get('max_photos')?.errors?.['max']">
                                  Must be at most 50
                                </div>
                                <div class="invalid-feedback" *ngIf="getItemFormGroup(i).hasError('photoLimitInvalid')">
                                  Max photos must be greater than or equal to min photos
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label fw-bold">Description</label>
                      <textarea class="form-control" 
                                rows="2" 
                                formControlName="description"
                                placeholder="Detailed instructions for this photo (e.g., 'Take a clear photo of the serial number tag and UL certification label')"></textarea>
                    </div>

                    <div class="mb-3">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label fw-bold">Sample Images</label>
                        <div class="btn-group btn-group-sm" role="group">
                          <button type="button" class="btn btn-outline-primary" 
                                  (click)="addSampleImage(i)" 
                                  title="Upload or add image URL">
                            <i class="mdi mdi-plus"></i>
                            Add Image
                          </button>
                          <button type="button" class="btn btn-outline-secondary" 
                                  (click)="pasteFromClipboard(i)" 
                                  title="Paste image from clipboard"
                                  *ngIf="getSampleImages(i).length === 0">
                            <i class="mdi mdi-clipboard-outline"></i>
                          </button>
                        </div>
                      </div>

                      <!-- Sample Images Info -->
                      <div class="mb-2" *ngIf="getSampleImages(i).length > 0">
                        <small class="text-muted">
                          <i class="mdi mdi-information-outline me-1"></i>
                          {{getSampleImages(i).length}} sample image{{getSampleImages(i).length !== 1 ? 's' : ''}} 
                          <span *ngIf="getPrimaryImage(i)" class="text-primary">
                            • Primary: {{getPrimaryImage(i)?.label || 'Main Photo'}}
                          </span>
                        </small>
                      </div>
                      
                      <!-- Sample Images Gallery -->
                      <div class="row g-2" *ngIf="getSampleImages(i).length > 0">
                        <div class="col-md-6 col-lg-4" *ngFor="let image of getSampleImages(i); let imgIndex = index; trackBy: trackBySampleImage">
                          <div class="card border sample-image-card position-relative"
                               [class.border-primary]="image.is_primary"
                               [class.border-2]="image.is_primary">
                            
                            <!-- Image Preview -->
                            <div class="position-relative">
                              <img [src]="image.url" 
                                   class="card-img-top sample-image-thumb"
                                   [alt]="image.label || 'Sample image'"
                                   (error)="onSampleImageError(i, imgIndex, $event)"
                                   (load)="onSampleImageLoad(i, imgIndex, $event)"
                                   style="height: 120px; object-fit: cover; cursor: pointer;"
                                   (click)="previewSampleImages(i, imgIndex)">
                              
                              <!-- Primary Badge -->
                              <div class="position-absolute top-0 start-0 m-1" *ngIf="image.is_primary">
                                <span class="badge bg-primary">
                                  <i class="mdi mdi-star me-1"></i>Primary
                                </span>
                              </div>
                              
                              <!-- Image Type Badge -->
                              <div class="position-absolute top-0 end-0 m-1" *ngIf="image.type">
                                <span class="badge bg-secondary">{{image.type}}</span>
                              </div>
                              
                              <!-- Remove Button -->
                              <button type="button" 
                                      class="btn btn-sm btn-danger position-absolute"
                                      style="top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0;"
                                      (click)="removeSampleImage(i, imgIndex)"
                                      title="Remove image">
                                <i class="mdi mdi-delete"></i>
                              </button>
                            </div>
                            
                            <!-- Image Info -->
                            <div class="card-body p-2">
                              <div class="d-flex justify-content-between align-items-start mb-1">
                                <input type="text" 
                                       class="form-control form-control-sm border-0 p-0 fw-bold" 
                                       [(ngModel)]="image.label"
                                       placeholder="Image label..."
                                       style="background: transparent;">
                                <div ngbDropdown class="d-inline-block" container="body">
                                  <button type="button" class="btn btn-sm btn-outline-secondary p-1" 
                                          ngbDropdownToggle>
                                    <i class="mdi mdi-dots-vertical"></i>
                                  </button>
                                  <div ngbDropdownMenu>
                                    <button type="button" class="dropdown-item" 
                                            (click)="setPrimaryImage(i, imgIndex); $event.stopPropagation()"
                                            [disabled]="image.is_primary">
                                      <i class="mdi mdi-star me-2"></i>
                                      {{image.is_primary ? 'Already Primary' : 'Set as Primary'}}
                                    </button>
                                    <div class="dropdown-divider"></div>
                                    <h6 class="dropdown-header">Image Type</h6>
                                    <button type="button" class="dropdown-item" 
                                            *ngFor="let type of imageTypes"
                                            (click)="setSampleImageType(i, imgIndex, type.value); $event.stopPropagation()"
                                            [class.active]="image.type === type.value">
                                      <i class="mdi {{type.icon}} me-2"></i>
                                      {{type.label}}
                                    </button>
                                    <div class="dropdown-divider"></div>
                                    <button type="button" class="dropdown-item text-danger" 
                                            (click)="removeSampleImage(i, imgIndex); $event.stopPropagation()">
                                      <i class="mdi mdi-delete me-2"></i>
                                      Remove Image
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <small class="text-muted">{{image.description || 'Click to add description...'}}</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Add First Image -->
                      <div class="card border-2 border-dashed text-center p-4" 
                           *ngIf="getSampleImages(i).length === 0"
                           style="cursor: pointer;"
                           (click)="addSampleImage(i)">
                        <i class="mdi mdi-image-plus text-muted mb-2" style="font-size: 2rem;"></i>
                        <p class="text-muted mb-2">Add sample images to help users understand what to photograph</p>
                        <button type="button" class="btn btn-primary btn-sm" (click)="addSampleImage(i)">
                          <i class="mdi mdi-upload me-1"></i>Upload or Add Image
                        </button>
                        <div class="mt-2">
                          <small class="text-muted">
                            <strong>💡 Multiple Images:</strong> Add drawings, BOMs, actual photos, and reference images
                          </small>
                        </div>
                      </div>
                    </div>

                    <!-- Photo Requirements (Expandable) -->
                    <div class="mt-3" *ngIf="showRequirements[i]">
                      <div class="bg-light rounded p-3 border">
                        <h6 class="text-primary mb-3">
                          <i class="mdi mdi-camera-settings me-2"></i>
                          Photo Requirements
                        </h6>
                        <div class="row" formGroupName="photo_requirements">
                          <div class="col-md-3 mb-3">
                            <label class="form-label fw-bold">Angle</label>
                            <select class="form-select form-select-sm" formControlName="angle">
                              <option value="">Any Angle</option>
                              <option value="front">Front View</option>
                              <option value="back">Back View</option>
                              <option value="side">Side View</option>
                              <option value="interior">Interior View</option>
                              <option value="overhead">Overhead View</option>
                            </select>
                          </div>
                          <div class="col-md-3 mb-3">
                            <label class="form-label fw-bold">Distance</label>
                            <select class="form-select form-select-sm" formControlName="distance">
                              <option value="">Any Distance</option>
                              <option value="close">Close-up</option>
                              <option value="medium">Medium Distance</option>
                              <option value="wide">Wide Shot</option>
                            </select>
                          </div>
                          <div class="col-md-3 mb-3">
                            <label class="form-label fw-bold">Lighting</label>
                            <select class="form-select form-select-sm" formControlName="lighting">
                              <option value="">Any Lighting</option>
                              <option value="good">Good Lighting</option>
                              <option value="bright">Bright Light</option>
                              <option value="low">Low Light OK</option>
                            </select>
                          </div>
                          <div class="col-md-3 mb-3">
                            <label class="form-label fw-bold">Focus Area</label>
                            <input type="text" 
                                   class="form-control form-control-sm" 
                                   formControlName="focus"
                                   placeholder="e.g., serial_numbers">
                            <small class="text-muted">Key element to focus on</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State for Items -->
              <div class="text-center p-5 border border-dashed rounded bg-light" *ngIf="items.length === 0">
                <i class="mdi mdi-image-plus text-primary mb-3" style="font-size: 3rem;"></i>
                <h5 class="text-muted mb-2">No Checklist Items</h5>
                <p class="text-muted mb-3">Start building your checklist by adding the first item</p>
                <button type="button" class="btn btn-primary" (click)="addItem()">
                  <i class="mdi mdi-plus me-2"></i>
                  Add First Item
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div class="modal-footer bg-light border-top d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center text-muted">
          <i class="mdi mdi-information-outline me-2"></i>
          <small>
            {{items.length}} item{{items.length !== 1 ? 's' : ''}} • 
            {{requiredItemsCount}} required •
            {{getItemsWithPhotoLimitsCount()}} with photo limits
            <span class="text-warning ms-2" *ngIf="formChanged">
              <i class="mdi mdi-pencil-outline me-1"></i>
              Unsaved changes
            </span>
          </small>
        </div>
        
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
            <i class="mdi mdi-close me-2"></i>
            Cancel
          </button>
          <button type="button" 
                  class="btn btn-primary d-flex align-items-center" 
                  (click)="saveTemplate()"
                  [disabled]="templateForm.invalid || saving"
                  [class.btn-success]="templateForm.valid && !saving">
            <div class="spinner-border spinner-border-sm me-2" *ngIf="saving"></div>
            <i class="mdi me-2" [class]="editingTemplate ? 'mdi-content-save' : 'mdi-plus'" *ngIf="!saving"></i>
            {{editingTemplate ? 'Update Template' : 'Create Template'}}
          </button>
        </div>
      </div>
    </ng-template>

    <!-- Image Preview Modal -->
    <ng-template #imagePreviewModal let-modal>
      <div class="modal-header border-0 pb-0">
        <div class="d-flex align-items-center justify-content-between w-100">
          <div class="d-flex align-items-center">
            <i class="mdi mdi-image me-2"></i>
            <div>
              <h5 class="modal-title mb-0">Sample Image Preview</h5>
              <small class="text-muted" *ngIf="getCurrentPreviewImageInfo()">
                {{getCurrentPreviewImageInfo()?.label || 'Sample Image'}}
                <span *ngIf="getCurrentPreviewImageInfo()?.type" class="badge bg-secondary ms-2">
                  {{getCurrentPreviewImageInfo()?.type | titlecase}}
                </span>
                <span *ngIf="getCurrentPreviewImageInfo()?.is_primary" class="badge bg-primary ms-1">
                  <i class="mdi mdi-star me-1"></i>Primary
                </span>
              </small>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-light text-dark" *ngIf="currentPreviewImages.length > 1">
              {{currentPreviewIndex + 1}} of {{currentPreviewImages.length}}
            </span>
            <button type="button" class="btn-close" (click)="modal.dismiss()" [attr.aria-label]="'Close'"></button>
          </div>
        </div>
      </div>
      
      <div class="modal-body p-0 position-relative">
        <!-- Navigation buttons for multiple images -->
        <button class="btn btn-primary position-absolute start-0 top-50 translate-middle-y ms-3"
                style="z-index: 10;"
                *ngIf="currentPreviewImages.length > 1"
                (click)="previousPreviewImage()"
                title="Previous image">
          <i class="mdi mdi-chevron-left"></i>
        </button>
        
        <button class="btn btn-primary position-absolute end-0 top-50 translate-middle-y me-3"
                style="z-index: 10;"
                *ngIf="currentPreviewImages.length > 1"
                (click)="nextPreviewImage()"
                title="Next image">
          <i class="mdi mdi-chevron-right"></i>
        </button>

        <div class="position-relative d-flex align-items-center justify-content-center" 
             style="min-height: 60vh; max-height: 80vh; background: #f8f9fa;">
          
          <!-- Loading State -->
          <div class="d-flex flex-column align-items-center justify-content-center" 
               *ngIf="previewImageLoading">
            <div class="spinner-border text-primary mb-3"></div>
            <p class="text-muted">Loading image...</p>
          </div>
          
          <!-- Error State -->
          <div class="d-flex flex-column align-items-center justify-content-center text-center" 
               *ngIf="previewImageError">
            <i class="mdi mdi-image-broken text-danger mb-3" style="font-size: 3rem;"></i>
            <h6 class="text-danger">Failed to load image</h6>
            <p class="text-muted">The image URL may be invalid or inaccessible</p>
            <button type="button" class="btn btn-outline-primary btn-sm" (click)="modal.dismiss()">
              Close Preview
            </button>
          </div>
          
          <!-- Image Display -->
          <div class="w-100 h-100 d-flex align-items-center justify-content-center p-3" 
               *ngIf="!previewImageLoading && !previewImageError">
            <img [src]="currentPreviewImage" 
                 class="img-fluid rounded shadow-sm"
                 [alt]="getCurrentPreviewImageInfo()?.label || 'Preview of sample image'"
                 style="max-width: 100%; max-height: 100%; object-fit: contain; cursor: zoom-in;"
                 [class.zoomed]="isImageZoomed"
                 (click)="toggleImageZoom()"
                 (load)="onPreviewImageLoad($event)"
                 (error)="onPreviewImageError($event)">
          </div>
          
          <!-- Zoom Indicator -->
          <div class="position-absolute top-0 end-0 m-3" 
               *ngIf="!previewImageLoading && !previewImageError">
            <span class="badge bg-dark bg-opacity-75">
              <i class="mdi" [class]="isImageZoomed ? 'mdi-magnify-minus' : 'mdi-magnify-plus'"></i>
              {{isImageZoomed ? 'Click to zoom out' : 'Click to zoom in'}}
            </span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer border-0 pt-0">
        <div class="d-flex justify-content-between align-items-center w-100">
          <div class="small text-muted">
            <i class="mdi mdi-information-outline me-1"></i>
            <span *ngIf="getCurrentPreviewImageInfo()?.description; else defaultDescription">
              {{getCurrentPreviewImageInfo()?.description}}
            </span>
            <ng-template #defaultDescription>
              This image shows the expected photo composition for this checklist item
            </ng-template>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="openImageInNewTab()">
              <i class="mdi mdi-open-in-new me-1"></i>
              Open in New Tab
            </button>
            <button type="button" class="btn btn-primary btn-sm" (click)="modal.close()">
              <i class="mdi mdi-check me-1"></i>
              Done
            </button>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Sample Image Upload Modal -->
    <ng-template #sampleImageUploadModal let-modal>
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title">
          <i class="mdi mdi-image-plus me-2"></i>
          Add Sample Image
        </h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()" [attr.aria-label]="'Close'"></button>
      </div>
      
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label fw-bold">Image Details</label>
          <div class="row">
            <div class="col-md-8">
              <input type="text" 
                     class="form-control" 
                     [(ngModel)]="currentUploadImage.label"
                     placeholder="e.g., Technical Drawing, Actual Photo, BOM..."
                     [attr.aria-label]="'Image label'">
              <small class="text-muted">Give this image a descriptive name</small>
            </div>
            <div class="col-md-4">
              <select class="form-select" [(ngModel)]="currentUploadImage.type">
                <option value="photo">Actual Photo</option>
                <option value="drawing">Technical Drawing</option>
                <option value="bom">Bill of Materials</option>
                <option value="schematic">Schematic</option>
                <option value="diagram">Diagram</option>
                <option value="reference">Reference Image</option>
              </select>
              <small class="text-muted">Image type</small>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <textarea class="form-control" 
                    rows="2" 
                    [(ngModel)]="currentUploadImage.description"
                    placeholder="Optional description of what this image shows..."
                    [attr.aria-label]="'Image description'"></textarea>
          <small class="text-muted">Optional: Describe what this image shows or how it helps users</small>
        </div>

        <div class="mb-3">
          <div class="form-check">
            <input type="checkbox" 
                   class="form-check-input" 
                   [(ngModel)]="currentUploadImage.is_primary"
                   id="primaryImageCheck">
            <label class="form-check-label" for="primaryImageCheck">
              <i class="mdi mdi-star me-1"></i>
              Set as primary image
            </label>
            <small class="form-text text-muted d-block">
              The primary image is shown as the main reference for users
            </small>
          </div>
        </div>

        <!-- Upload Methods Tabs -->
        <div class="card border">
          <div class="card-header p-2">
            <ul class="nav nav-tabs card-header-tabs nav-tabs-sm" role="tablist">
              <li class="nav-item">
                <button class="nav-link active" 
                        id="upload-file-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#upload-file" 
                        type="button" 
                        role="tab"
                        [attr.aria-controls]="'upload-file'"
                        [attr.aria-selected]="'true'">
                  <i class="mdi mdi-upload me-1"></i>Upload File
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" 
                        id="url-input-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#url-input" 
                        type="button" 
                        role="tab"
                        [attr.aria-controls]="'url-input'"
                        [attr.aria-selected]="'false'">
                  <i class="mdi mdi-link me-1"></i>Image URL
                </button>
              </li>
            </ul>
          </div>
          <div class="card-body p-3">
            <div class="tab-content">
              <!-- File Upload Tab -->
              <div class="tab-pane fade show active" 
                   id="upload-file" 
                   role="tabpanel" 
                   aria-labelledby="upload-file-tab">
                <div class="upload-area border-2 border-dashed rounded p-4 text-center position-relative"
                     [class.border-primary]="!currentImageUploading"
                     [class.border-success]="currentImageUploading"
                     (dragover)="onDragOver($event)"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onSampleImageDrop($event)">
                  <input type="file" 
                         class="position-absolute w-100 h-100" 
                         style="opacity: 0; top: 0; left: 0; cursor: pointer;"
                         accept="image/*"
                         id="sample-image-file-input"
                         (change)="onSampleImageFileSelected($event)">
                  
                  <div *ngIf="!currentImageUploading">
                    <i class="mdi mdi-cloud-upload text-primary mb-2" style="font-size: 2rem;"></i>
                    <p class="text-muted mb-2">Drag & drop an image here or click to browse</p>
                    <button type="button" class="btn btn-primary"
                            (click)="triggerSampleImageUpload()">
                      <i class="mdi mdi-plus me-1"></i>Choose Image File
                    </button>
                    <div class="mt-2">
                      <small class="text-muted">
                        Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
                      </small>
                    </div>
                  </div>
                  
                  <div *ngIf="currentImageUploading" class="text-success">
                    <div class="spinner-border spinner-border-sm me-2"></div>
                    Uploading image...
                    <div class="progress mt-2" style="height: 4px;">
                      <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                           style="width: 100%"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- URL Input Tab -->
              <div class="tab-pane fade" 
                   id="url-input" 
                   role="tabpanel" 
                   aria-labelledby="url-input-tab">
                <div class="input-group">
                  <span class="input-group-text"><i class="mdi mdi-link"></i></span>
                  <input type="url" 
                         class="form-control" 
                         [(ngModel)]="currentUploadImage.url"
                         placeholder="https://example.com/image.jpg"
                         [attr.aria-label]="'Image URL'">
                  <button class="btn btn-outline-secondary" type="button" 
                          (click)="validateSampleImageUrl()"
                          title="Validate URL">
                    <i class="mdi mdi-check"></i>
                  </button>
                </div>
                <small class="text-muted">
                  <i class="mdi mdi-information-outline me-1"></i>
                  Enter a direct URL to an image file
                </small>
                
                <!-- URL Preview -->
                <div class="mt-3" *ngIf="currentUploadImage.url && currentUploadImage.url.trim().length > 0">
                  <div class="d-flex align-items-start gap-3">
                    <div class="position-relative">
                      <img [src]="currentUploadImage.url" 
                           class="img-thumbnail"
                           style="max-width: 120px; max-height: 90px; object-fit: cover;"
                           (load)="onSampleImageUrlLoad($event)"
                           (error)="onSampleImageUrlError($event)"
                           [alt]="currentUploadImage.label || 'Preview'">
                    </div>
                    <div class="flex-grow-1">
                      <small class="text-success" *ngIf="currentUploadImage.status === 'loaded'">
                        <i class="mdi mdi-check-circle me-1"></i>
                        Image URL is valid
                      </small>
                      <small class="text-danger" *ngIf="currentUploadImage.status === 'error'">
                        <i class="mdi mdi-alert-circle me-1"></i>
                        Failed to load image from URL
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer border-0">
        <div class="d-flex justify-content-between align-items-center w-100">
          <small class="text-muted">
            <i class="mdi mdi-lightbulb-outline me-1"></i>
            <strong>Tip:</strong> Add multiple images like drawings, BOMs, and actual photos to help users understand what to capture
          </small>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
              Cancel
            </button>
            <button type="button" 
                    class="btn btn-primary" 
                    (click)="addSampleImageToItem(modal)"
                    [disabled]="!currentUploadImage.url || currentImageUploading">
              <i class="mdi mdi-plus me-1"></i>
              Add Image
            </button>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Version History Modal -->
    <ng-template #versionHistoryModal let-modal>
      <div class="modal-header bg-gradient bg-info text-white border-0">
        <div class="d-flex align-items-center">
          <i class="mdi mdi-source-branch me-2 fs-4"></i>
          <div>
            <h5 class="modal-title mb-0 text-white">Version History</h5>
            <small class="text-white-50" *ngIf="selectedTemplateFamily">
              {{getTemplateFamilyName(selectedTemplateFamily)}}
            </small>
          </div>
        </div>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>

      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <!-- Loading State -->
        <div class="text-center p-4" *ngIf="loadingVersionHistory">
          <div class="spinner-border text-primary"></div>
          <p class="mt-2 text-muted">Loading version history...</p>
        </div>

        <!-- Version Timeline -->
        <div class="version-timeline" *ngIf="!loadingVersionHistory && versionHistory.length > 0">
          <div class="timeline-item" 
               *ngFor="let version of versionHistory; let i = index; trackBy: trackByVersionId"
               [class.current-version]="version.id === selectedTemplateFamily?.id">
            
            <!-- Timeline Connector -->
            <div class="timeline-connector" *ngIf="i < versionHistory.length - 1"></div>
            
            <!-- Version Card -->
            <div class="card shadow-sm version-card" 
                 [class.border-primary]="version.id === selectedTemplateFamily?.id"
                 [class.border-2]="version.id === selectedTemplateFamily?.id">
              
              <div class="card-header d-flex justify-content-between align-items-center py-2"
                   [class.bg-primary]="version.id === selectedTemplateFamily?.id"
                   [class.text-white]="version.id === selectedTemplateFamily?.id">
                <div class="d-flex align-items-center">
                  <span class="version-badge me-2" 
                        [class.badge-primary]="version.id === selectedTemplateFamily?.id"
                        [class.badge-secondary]="version.id !== selectedTemplateFamily?.id">
                    v{{version.version}}
                  </span>
                  <div>
                    <h6 class="mb-0" [class.text-white]="version.id === selectedTemplateFamily?.id">
                      {{version.name}}
                    </h6>
                    <small [class.text-white-50]="version.id === selectedTemplateFamily?.id"
                           [class.text-muted]="version.id !== selectedTemplateFamily?.id">
                      {{getVersionTypeLabel(version)}}
                    </small>
                  </div>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                  <span class="badge" 
                        [class.bg-success]="version.is_active"
                        [class.bg-warning]="!version.is_active">
                    {{version.is_active ? 'Active' : 'Inactive'}}
                  </span>
                  <span class="badge bg-light text-dark" *ngIf="version.id === selectedTemplateFamily?.id">
                    Current
                  </span>
                </div>
              </div>

              <div class="card-body py-3">
                <div class="row g-3 text-center mb-3">
                  <div class="col-3">
                    <div class="stat-small">{{version.item_count || 0}}</div>
                    <small class="text-muted">Items</small>
                  </div>
                  <div class="col-3">
                    <div class="stat-small">{{version.active_instances || 0}}</div>
                    <small class="text-muted">Instances</small>
                  </div>
                  <div class="col-3">
                    <div class="stat-small">{{getVersionAge(version)}}</div>
                    <small class="text-muted">Age</small>
                  </div>
                  <div class="col-3">
                    <div class="stat-small">{{version.created_at ? (version.created_at | date:'short') : 'Unknown'}}</div>
                    <small class="text-muted">Created</small>
                  </div>
                </div>

                <!-- Change Summary -->
                <div class="version-changes mb-3" *ngIf="getVersionChanges(version, i).length > 0">
                  <h6 class="text-primary mb-2">
                    <i class="mdi mdi-delta me-1"></i>
                    Changes from Previous Version
                  </h6>
                  <ul class="list-unstyled mb-0">
                    <li *ngFor="let change of getVersionChanges(version, i)" class="small mb-1">
                      <i class="mdi me-1" [class]="change.icon" [style.color]="change.color"></i>
                      {{change.description}}
                    </li>
                  </ul>
                </div>

                <!-- Version Actions -->
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" 
                          (click)="viewVersionDetails(version)">
                    <i class="mdi mdi-eye me-1"></i>
                    View Details
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" 
                          (click)="compareVersionsModal(version)"
                          [disabled]="i >= versionHistory.length - 1">
                    <i class="mdi mdi-compare me-1"></i>
                    Compare
                  </button>
                  <button class="btn btn-sm btn-outline-success" 
                          (click)="reactivateVersion(version)"
                          *ngIf="!version.is_active && version.active_instances === 0">
                    <i class="mdi mdi-backup-restore me-1"></i>
                    Reactivate
                  </button>
                  <button class="btn btn-sm btn-outline-info" 
                          (click)="createVersionBranch(version)">
                    <i class="mdi mdi-source-branch me-1"></i>
                    New Branch
                  </button>
                </div>
              </div>

              <!-- Version Footer -->
              <div class="card-footer bg-light py-2" *ngIf="version.description">
                <small class="text-muted">
                  <i class="mdi mdi-information-outline me-1"></i>
                  {{version.description}}
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="text-center p-5" *ngIf="!loadingVersionHistory && versionHistory.length === 0">
          <i class="mdi mdi-source-branch text-muted mb-3" style="font-size: 3rem;"></i>
          <h5 class="text-muted">No Version History</h5>
          <p class="text-muted">This template doesn't have any version history yet.</p>
        </div>
      </div>

      <div class="modal-footer bg-light border-top">
        <div class="d-flex justify-content-between align-items-center w-100">
          <div class="small text-muted">
            <i class="mdi mdi-information-outline me-1"></i>
            {{versionHistory.length}} version{{versionHistory.length !== 1 ? 's' : ''}} found
            <span *ngIf="getActiveVersionsCount() > 0" class="text-success ms-2">
              • {{getActiveVersionsCount()}} active
            </span>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
              <i class="mdi mdi-close me-1"></i>
              Close
            </button>
            <button type="button" class="btn btn-primary" 
                    (click)="createNewVersionFromHistory()"
                    *ngIf="selectedTemplateFamily">
              <i class="mdi mdi-plus me-1"></i>
              Create New Version
            </button>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Version Comparison Modal -->
    <ng-template #versionComparisonModal let-modal>
      <div class="modal-header bg-gradient bg-primary text-white border-0">
        <div class="d-flex align-items-center">
          <i class="mdi mdi-compare me-2 fs-4"></i>
          <div>
            <h5 class="modal-title mb-0 text-white">Version Comparison</h5>
            <small class="text-white-50" *ngIf="comparisonVersions.length === 2">
              v{{comparisonVersions[0].version}} vs v{{comparisonVersions[1].version}}
            </small>
          </div>
        </div>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>

      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <div class="row" *ngIf="comparisonVersions.length === 2">
          <!-- Left Version -->
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header bg-light">
                <h6 class="mb-0">
                  <span class="badge bg-primary me-2">v{{comparisonVersions[1].version}}</span>
                  Newer Version
                </h6>
                <small class="text-muted">{{comparisonVersions[1].updated_at | date:'medium'}}</small>
              </div>
              <div class="card-body">
                <div class="comparison-section mb-3">
                  <h6 class="text-primary">Basic Information</h6>
                  <table class="table table-sm">
                    <tr>
                      <td>Name:</td>
                      <td>{{comparisonVersions[1].name}}</td>
                    </tr>
                    <tr>
                      <td>Part Number:</td>
                      <td>{{comparisonVersions[1].part_number || 'N/A'}}</td>
                    </tr>
                    <tr>
                      <td>Category:</td>
                      <td>{{comparisonVersions[1].category | titlecase}}</td>
                    </tr>
                    <tr>
                      <td>Items:</td>
                      <td>{{comparisonVersions[1].item_count || 0}}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Version -->
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header bg-light">
                <h6 class="mb-0">
                  <span class="badge bg-secondary me-2">v{{comparisonVersions[0].version}}</span>
                  Older Version
                </h6>
                <small class="text-muted">{{comparisonVersions[0].updated_at | date:'medium'}}</small>
              </div>
              <div class="card-body">
                <div class="comparison-section mb-3">
                  <h6 class="text-secondary">Basic Information</h6>
                  <table class="table table-sm">
                    <tr>
                      <td>Name:</td>
                      <td>{{comparisonVersions[0].name}}</td>
                    </tr>
                    <tr>
                      <td>Part Number:</td>
                      <td>{{comparisonVersions[0].part_number || 'N/A'}}</td>
                    </tr>
                    <tr>
                      <td>Category:</td>
                      <td>{{comparisonVersions[0].category | titlecase}}</td>
                    </tr>
                    <tr>
                      <td>Items:</td>
                      <td>{{comparisonVersions[0].item_count || 0}}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Change Summary -->
        <div class="card mt-3" *ngIf="comparisonChanges.length > 0">
          <div class="card-header bg-warning text-dark">
            <h6 class="mb-0">
              <i class="mdi mdi-delta me-2"></i>
              Detected Changes ({{comparisonChanges.length}})
            </h6>
          </div>
          <div class="card-body">
            <div class="change-item mb-2" *ngFor="let change of comparisonChanges">
              <div class="d-flex align-items-start">
                <i class="mdi me-2 mt-1" [class]="change.icon" [style.color]="change.color"></i>
                <div>
                  <strong>{{change.field | titlecase}}:</strong>
                  <span class="ms-2">{{change.description}}</span>
                  <div class="mt-1" *ngIf="change.details">
                    <small class="text-muted">{{change.details}}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Changes -->
        <div class="text-center p-4" *ngIf="comparisonChanges.length === 0 && comparisonVersions.length === 2">
          <i class="mdi mdi-check-circle text-success mb-2" style="font-size: 2rem;"></i>
          <h6 class="text-muted">No Significant Changes</h6>
          <p class="text-muted mb-0">These versions appear to be identical in structure.</p>
        </div>
      </div>

      <div class="modal-footer bg-light border-top">
        <div class="d-flex justify-content-between align-items-center w-100">
          <div class="small text-muted">
            <i class="mdi mdi-information-outline me-1"></i>
            Comparing {{comparisonChanges.length}} differences between versions
          </div>
          <button type="button" class="btn btn-primary" (click)="modal.close()">
            <i class="mdi mdi-check me-1"></i>
            Done
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .template-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .template-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    
    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #495057;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: #6c757d;
      text-transform: uppercase;
      font-weight: 500;
    }
    
    .item-card {
      border-left: 4px solid #007bff;
      transition: all 0.2s ease;
    }
    
    .item-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .item-card.cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 5px 15px -5px rgba(0, 0, 0, 0.4);
      transform: rotate(5deg);
    }
    
    .item-card.cdk-drag-placeholder {
      opacity: 0;
      border: 2px dashed #007bff;
      background: rgba(0, 123, 255, 0.05);
    }
    
    .item-card.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    
    .cdk-drop-list-dragging .item-card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    
    .items-container {
      min-height: 100px;
    }
    
    .item-number {
      min-width: 28px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .modal-header {
      border-bottom: 2px solid #e9ecef;
    }
    
    .progress {
      border-radius: 10px;
      overflow: hidden;
    }
    
    .progress-bar {
      transition: width 0.3s ease;
    }
    
    .form-label.fw-bold {
      color: #495057;
      font-size: 0.875rem;
    }
    
    .card-header.bg-primary h6,
    .card-header.bg-success h6 {
      font-weight: 600;
    }
    
    .btn:focus {
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
    
    .alert-info {
      border-left: 4px solid #17a2b8;
      background-color: #f8f9fa;
      border-color: #e9ecef;
    }
    
    .bg-light.rounded {
      background-color: #f8f9fa !important;
    }
    
    .upload-area {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .upload-area:hover {
      background-color: rgba(0, 123, 255, 0.05);
    }
    
    .nav-tabs-sm .nav-link {
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }
    
    .tab-content {
      min-height: 120px;
    }

    /* Image Preview Modal Styles */
    ::ng-deep .image-preview-modal .modal-dialog {
      max-width: 95vw;
      max-height: 95vh;
    }

    ::ng-deep .image-preview-modal .modal-content {
      height: 95vh;
      border: none;
      border-radius: 12px;
      overflow: hidden;
    }

    .zoomed {
      transform: scale(1.5);
      transition: transform 0.3s ease;
      cursor: zoom-out !important;
    }

    .img-fluid {
      transition: transform 0.3s ease;
    }

    .position-relative .badge {
      backdrop-filter: blur(4px);
      font-size: 0.7rem;
    }

    .modal-body .position-relative {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .spinner-border {
      width: 3rem;
      height: 3rem;
    }

    .btn-sm {
      transition: all 0.2s ease;
    }

    .btn-sm:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    /* Sample Image Cards */
    .sample-image-card {
      transition: all 0.2s ease;
    }

    .sample-image-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .sample-image-card:hover .btn-danger {
      opacity: 1 !important;
    }

    .sample-image-thumb {
      transition: transform 0.2s ease;
    }

    .sample-image-card:hover .sample-image-thumb {
      transform: scale(1.02);
    }

    .sample-image-card .card-body input {
      transition: border-color 0.2s ease;
    }

    .sample-image-card .card-body input:focus {
      border-color: #007bff !important;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    /* Navigation buttons in preview */
    .btn-primary.position-absolute {
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .btn-primary.position-absolute:hover {
      transform: translate(-50%, -50%) scale(1.1);
    }

    /* Version History Modal Styles */
    ::ng-deep .version-history-modal .modal-dialog {
      max-width: 1000px;
    }

    ::ng-deep .version-history-modal .modal-content {
      border-radius: 12px;
      border: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }

    .version-timeline {
      position: relative;
      padding: 0 20px;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 2rem;
      padding-left: 30px;
    }

    .timeline-item::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 20px;
      width: 12px;
      height: 12px;
      background: #007bff;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 2;
    }

    .timeline-item.current-version::before {
      background: #28a745;
      box-shadow: 0 0 0 4px rgba(40, 167, 69, 0.2);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(40, 167, 69, 0); }
      100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
    }

    .timeline-connector {
      position: absolute;
      left: -1px;
      top: 32px;
      bottom: -32px;
      width: 2px;
      background: linear-gradient(to bottom, #007bff, #e9ecef);
      z-index: 1;
    }

    .timeline-item:last-child .timeline-connector {
      display: none;
    }

    .version-card {
      border-radius: 8px;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .version-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
    }

    .version-card.border-primary {
      border-width: 2px !important;
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
    }

    .version-badge {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      background: #e9ecef;
      color: #495057;
      border: none;
    }

    .version-badge.badge-primary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .version-badge.badge-secondary {
      background: #6c757d;
      color: white;
    }

    .stat-small {
      font-size: 1.1rem;
      font-weight: 600;
      color: #495057;
      line-height: 1.2;
    }

    .version-changes {
      background: rgba(0, 123, 255, 0.05);
      border-left: 3px solid #007bff;
      padding: 0.75rem;
      border-radius: 0 6px 6px 0;
    }

    .version-changes h6 {
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .version-changes ul li {
      padding: 0.125rem 0;
      color: #495057;
    }

    .version-changes .mdi {
      font-size: 1rem;
    }

    /* Version Actions */
    .version-card .btn-sm {
      font-size: 0.75rem;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .version-card .btn-outline-primary:hover {
      background: #007bff;
      transform: none;
    }

    .version-card .btn-outline-secondary:hover {
      background: #6c757d;
      transform: none;
    }

    .version-card .btn-outline-success:hover {
      background: #28a745;
      transform: none;
    }

    .version-card .btn-outline-info:hover {
      background: #17a2b8;
      transform: none;
    }

    /* Modal Header Gradient */
    .modal-header.bg-gradient.bg-info {
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%) !important;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .version-timeline {
        padding: 0 10px;
      }
      
      .timeline-item {
        padding-left: 20px;
      }
      
      .version-card .d-flex.gap-2.flex-wrap {
        flex-direction: column !important;
      }
      
      .version-card .btn-sm {
        width: 100%;
        margin-bottom: 0.25rem;
      }
    }

    /* Version Comparison Modal Styles */
    ::ng-deep .version-comparison-modal .modal-dialog {
      max-width: 1200px;
    }

    .comparison-header {
      background: linear-gradient(135deg, #6f42c1 0%, #495057 100%);
      color: white;
      padding: 1rem;
      border-radius: 8px 8px 0 0;
    }

    .comparison-section {
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .comparison-table {
      margin-bottom: 0;
    }

    .comparison-table th {
      background: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
      font-weight: 600;
      color: #495057;
    }

    .comparison-table td {
      vertical-align: middle;
      padding: 0.75rem;
    }

    .comparison-change {
      padding: 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      border-left: 4px solid;
    }

    .comparison-change.bg-warning {
      background: rgba(255, 193, 7, 0.1) !important;
      border-left-color: #ffc107;
    }

    .comparison-change.bg-success {
      background: rgba(40, 167, 69, 0.1) !important;
      border-left-color: #28a745;
    }

    .comparison-change.bg-danger {
      background: rgba(220, 53, 69, 0.1) !important;
      border-left-color: #dc3545;
    }
  `],
  animations: [
    // Add slide animation for requirements section
  ]
})
export class ChecklistTemplateManagerComponent implements OnInit {
  @ViewChild('versionHistoryModal') versionHistoryModal!: TemplateRef<any>;
  @ViewChild('versionComparisonModal') versionComparisonModal!: TemplateRef<any>;

  // Version tracking properties
  selectedTemplateFamily: ChecklistTemplate | null = null;
  versionHistory: ChecklistTemplate[] = [];
  loadingVersionHistory = false;
  comparisonVersions: ChecklistTemplate[] = [];
  comparisonChanges: any[] = [];

  // Enhanced template properties
  templates: ChecklistTemplate[] = [];
  templateFamilies: Map<string, ChecklistTemplate[]> = new Map();
  
  loading = false;
  saving = false;

  // Template search and filter properties
  templateSearch = '';
  templateFilters = {
    category: '',
    partNumber: '',
    activeOnly: null as boolean | null
  };
  editingTemplate: ChecklistTemplate | null = null;
  templateForm: FormGroup;
  showRequirements: boolean[] = [];
  imageStatuses: { [key: number]: 'loading' | 'loaded' | 'error' } = {};
  formChanged = false;
  uploadingImages: { [key: number]: boolean } = {};
  uploadingTemplateImage = false;
  selectedQualityDocument: QualityDocumentSelection | null = null;

  @ViewChild('templateModal') templateModal!: TemplateRef<any>;
  @ViewChild('imagePreviewModal') imagePreviewModal!: TemplateRef<any>;
  @ViewChild('sampleImageUploadModal') sampleImageUploadModal!: TemplateRef<any>;

  // Image preview state
  currentPreviewImage: string = '';
  previewImageLoading: boolean = false;
  previewImageError: boolean = false;
  isImageZoomed: boolean = false;

  // Sample images management
  sampleImages: { [itemIndex: number]: SampleImage[] } = {};
  currentPreviewImages: SampleImage[] = [];
  currentPreviewIndex: number = 0;

  // Current upload state
  currentUploadImage: SampleImage = {
    id: '',
    url: '',
    label: '',
    description: '',
    type: 'photo',
    is_primary: false,
    order_index: 0,
    status: 'loading'
  };
  currentUploadItemIndex: number = -1;
  currentImageUploading: boolean = false;

  // Image type options
  imageTypes = [
    { value: 'photo', label: 'Actual Photo', icon: 'mdi-camera' },
    { value: 'drawing', label: 'Technical Drawing', icon: 'mdi-drawing' },
    { value: 'bom', label: 'Bill of Materials', icon: 'mdi-format-list-bulleted' },
    { value: 'schematic', label: 'Schematic', icon: 'mdi-sitemap' },
    { value: 'diagram', label: 'Diagram', icon: 'mdi-chart-line' },
    { value: 'reference', label: 'Reference Image', icon: 'mdi-bookmark' }
  ];

  constructor(
    private configService: PhotoChecklistConfigService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    private attachmentsService: AttachmentsService,
    private uploadService: UploadService,
    private photoUploadService: PhotoChecklistUploadService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.templateForm = this.createTemplateForm();
  }

  ngOnInit(): void {
    this.loadTemplates();
    
    // Track form changes
    this.templateForm.valueChanges.subscribe(() => {
      this.formChanged = true;
    });
  }

  // ==============================================
  // AGS Pattern Helper Methods
  // ==============================================

  getActiveTemplatesCount(): number {
    return this.templates.filter(template => template.is_active).length;
  }

  viewTemplate(template: ChecklistTemplate): void {
    // Navigate to view mode or open preview modal
    this.router.navigate(['../template-editor', template.id], { 
      relativeTo: this.route,
      queryParams: { mode: 'view' }
    });
  }

  // ==============================================
  // Template Management
  // ==============================================

  loadTemplates(): void {
    this.loading = true;
    this.configService.getTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.buildTemplateFamiliesMap(); // Build family relationships for version indicators
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.loading = false;
      }
    });
  }

  openTemplateModal(template?: ChecklistTemplate): void {
    this.editingTemplate = template || null;
    this.formChanged = false;
    
    if (template) {
      this.loadTemplateForEdit(template);
    } else {
      this.templateForm = this.createTemplateForm();
    }
    
    this.modalService.open(this.templateModal, { 
      size: 'xl', 
      backdrop: 'static',
      scrollable: true,
      container: 'body'
    });
  }

  editTemplate(template: ChecklistTemplate): void {
    // Navigate to the dedicated template editor page
    this.router.navigate(['../template-editor', template.id], { relativeTo: this.route });
  }

  createNewTemplate(): void {
    // Navigate to the template editor page for creating a new template
    this.router.navigate(['../template-editor'], { relativeTo: this.route });
  }

  duplicateTemplate(template: ChecklistTemplate): void {
    this.configService.getTemplate(template.id).subscribe({
      next: (fullTemplate) => {
        // Create a copy with new name
        const duplicated = {
          ...fullTemplate,
          name: `${fullTemplate.name} (Copy)`,
          version: '1.0'
        };
        delete duplicated.id;
        
        this.openTemplateModal(duplicated as ChecklistTemplate);
      },
      error: (error) => {
        console.error('Error duplicating template:', error);
      }
    });
  }

  deleteTemplate(template: ChecklistTemplate): void {
    if (confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      this.configService.deleteTemplate(template.id).subscribe({
        next: () => {
          this.loadTemplates();
        },
        error: (error) => {
          console.error('Error deleting template:', error);
          alert('Error deleting template. Please try again.');
        }
      });
    }
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formValue = this.templateForm.value;
    
    // Debug: Log sample images before processing
    console.log('Sample images before processing:', this.sampleImages);
    
    // Process items to ensure proper structure
    const processedItems = formValue.items.map((item: any, index: number) => {
      const itemSampleImages = this.sampleImages[index] || [];
      console.log(`Item ${index} sample images:`, itemSampleImages);
      
      return {
        ...item,
        order_index: index + 1,
        photo_requirements: {
          ...item.photo_requirements,
          min_photos: item.min_photos,
          max_photos: item.max_photos
        },
        min_photos: item.min_photos,
        max_photos: item.max_photos,
        // Include sample images data
        sample_images: itemSampleImages,
        // Keep legacy field for backward compatibility - get from sample_images array
        sample_image_url: itemSampleImages?.find(img => img.is_primary)?.url || ''
      };
    });

    console.log('Processed items with sample images:', processedItems);

    const templateData = {
      ...formValue,
      items: processedItems,
      // Add quality document metadata for traceability
      quality_document_metadata: this.selectedQualityDocument ? {
        document_id: this.selectedQualityDocument.documentId,
        revision_id: this.selectedQualityDocument.revisionId,
        document_number: this.selectedQualityDocument.documentNumber,
        version_string: this.selectedQualityDocument.versionString,
        title: this.selectedQualityDocument.title,
        revision_number: this.selectedQualityDocument.revisionNumber
      } : null
    };

    const saveObservable = this.editingTemplate 
      ? this.configService.updateTemplate(this.editingTemplate.id, templateData)
      : this.configService.createTemplate(templateData);

    saveObservable.subscribe({
      next: () => {
        this.saving = false;
        this.modalService.dismissAll();
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error saving template:', error);
        this.saving = false;
        
        // Handle foreign key constraint violation specifically
        if (error?.error?.error?.includes('foreign key constraint fails') || 
            error?.error?.error?.includes('photo_submissions')) {
          this.handleForeignKeyConstraintError();
        } else {
          alert('Error saving template. Please try again.');
        }
      }
    });
  }

  private handleForeignKeyConstraintError(): void {
    const currentName = this.templateForm.get('name')?.value;
    const currentVersion = this.templateForm.get('version')?.value || '1.0';
    const activeInstances = this.editingTemplate?.active_instances || 0;
    
    const message = `
      Template "${currentName}" has ${activeInstances} active instance${activeInstances !== 1 ? 's' : ''} with existing photo submissions.
      
      To preserve data integrity, choose how to handle your changes:
    `;
    
    // Create a more sophisticated dialog using confirm for now (can be enhanced with modal later)
    const choice = this.showVersioningChoiceDialog(currentVersion, activeInstances);
    
    switch (choice) {
      case 'update':
        this.forceUpdateTemplate();
        break;
      case 'revision':
        this.createNewRevision();
        break;
      case 'major':
        this.createMajorVersion();
        break;
      default:
        // User cancelled
        break;
    }
  }

  private showVersioningChoiceDialog(currentVersion: string, activeInstances: number): string {
    const options = `
Choose how to handle your changes:

1. UPDATE current version (${currentVersion}) - ⚠️ Risk: May affect active checklists
2. CREATE new revision (${this.getNextRevision(currentVersion)}) - ✅ Recommended: Safe versioning  
3. CREATE major version (${this.getNextMajorVersion(currentVersion)}) - 🆕 For major redesigns
4. CANCEL and review changes

Enter choice (1-4):`;
    
    const userChoice = prompt(`Template has ${activeInstances} active instances.\n\n${options}`);
    
    switch (userChoice) {
      case '1': return 'update';
      case '2': return 'revision';
      case '3': return 'major';
      default: return 'cancel';
    }
  }

  private forceUpdateTemplate(): void {
    // Add force flag to bypass foreign key constraint (requires backend support)
    const confirmation = confirm(`
      ⚠️ WARNING: This will modify the active template in-place.
      
      This may affect ${this.editingTemplate?.active_instances} active checklist instances.
      
      Continue with forced update?
    `);
    
    if (confirmation) {
      // Implementation would require backend support for force updates
      // For now, show message about contacting administrator
      alert(`
        Force update requires administrator approval to maintain data integrity.
        
        Please contact your system administrator to:
        1. Review the impact on active instances
        2. Perform the update safely
        3. Notify users of any changes
      `);
    }
  }

  private createNewRevision(): void {
    const currentVersion = this.templateForm.get('version')?.value || '1.0';
    const newVersion = this.getNextRevision(currentVersion);
    
    // Reset to create mode and increment revision
    this.editingTemplate = null;
    this.templateForm.patchValue({
      name: `${this.templateForm.get('name')?.value}`,
      version: newVersion
    });
    
    // Add version suffix to make it clear this is a revision
    const currentName = this.templateForm.get('name')?.value;
    if (!currentName.includes(`v${newVersion}`)) {
      this.templateForm.patchValue({
        name: `${currentName} (v${newVersion})`
      });
    }
    
    console.log(`Creating new revision: ${newVersion}`);
    this.saveTemplate();
  }

  private createMajorVersion(): void {
    const currentVersion = this.templateForm.get('version')?.value || '1.0';
    const newVersion = this.getNextMajorVersion(currentVersion);
    
    // Reset to create mode and increment major version
    this.editingTemplate = null;
    this.templateForm.patchValue({
      version: newVersion
    });
    
    // Update name to reflect major version change
    const currentName = this.templateForm.get('name')?.value;
    const baseName = currentName.replace(/\s*\(v\d+\.\d+\)/, ''); // Remove existing version suffix
    this.templateForm.patchValue({
      name: `${baseName} v${newVersion}`
    });
    
    console.log(`Creating major version: ${newVersion}`);
    this.saveTemplate();
  }

  getNextRevision(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    
    return `${major}.${minor + 1}`;
  }

  getNextMajorVersion(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 1;
    
    return `${major + 1}.0`;
  }

  // ==============================================
  // UI Version Control Support Methods
  // ==============================================

  prepareForceUpdate(): void {
    const confirmation = confirm(`
      ⚠️ WARNING: Force Update Active Template
      
      This will modify template v${this.editingTemplate?.version} in-place, which has ${this.editingTemplate?.active_instances} active instances.
      
      Risks:
      • May break existing checklists
      • Could lose submitted photo data
      • Requires administrator approval
      
      Continue with preparation for force update?
    `);
    
    if (confirmation) {
      // Mark for force update - actual implementation would need backend support
      alert(`
        Prepared for force update. When you save:
        
        1. System will attempt forced save
        2. If it fails, administrator will be notified
        3. Data integrity warnings will be logged
        
        Proceed with caution.
      `);
    }
  }

  prepareNewRevision(): void {
    const currentVersion = this.editingTemplate?.version || '1.0';
    const newVersion = this.getNextRevision(currentVersion);
    
    const confirmation = confirm(`
      ✅ Create New Revision (Recommended)
      
      This will create template v${newVersion} as a new revision:
      
      Benefits:
      • Preserves existing v${currentVersion} and all its data
      • New checklists will use v${newVersion}
      • Zero risk to submitted photos
      • Clean version history
      
      Continue with new revision?
    `);
    
    if (confirmation) {
      this.createNewRevision();
    }
  }

  prepareMajorVersion(): void {
    const currentVersion = this.editingTemplate?.version || '1.0';
    const newVersion = this.getNextMajorVersion(currentVersion);
    
    const confirmation = confirm(`
      🚀 Create Major Version
      
      This will create template v${newVersion} as a new major version:
      
      Use for:
      • Complete template redesigns
      • New product lines
      • Major structural changes
      
      Current v${currentVersion} will remain unchanged.
      Continue with major version?
    `);
    
    if (confirmation) {
      this.createMajorVersion();
    }
  }

  // ==============================================
  // Quality Document Integration
  // ==============================================

  onQualityDocumentSelected(selection: QualityDocumentSelection | null): void {
    this.selectedQualityDocument = selection;
    
    if (selection) {
      // Auto-populate template fields from quality document
      this.templateForm.patchValue({
        version: selection.versionString,
        // If template name is empty, suggest using the quality document title
        name: !this.templateForm.get('name')?.value ? 
          `${selection.title} - Checklist Template` : 
          this.templateForm.get('name')?.value
      });
      
      console.log('Quality document selected:', selection);
    } else {
      // Reset version when no document is selected
      this.templateForm.patchValue({
        version: '1.0'
      });
    }
  }

  // ==============================================
  // Form Management
  // ==============================================

  createTemplateForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      description: [''],
      part_number: [''],
      product_type: [''],
      category: ['quality_control'],
      quality_document: [null], // This will hold the QualityDocumentSelection
      version: ['1.0'], // Keep for backward compatibility, but will be auto-populated
      items: this.fb.array([])
    });
  }

  loadTemplateForEdit(template: ChecklistTemplate): void {
    this.templateForm.patchValue({
      name: template.name,
      description: template.description,
      part_number: template.part_number,
      product_type: template.product_type,
      category: template.category,
      version: template.version
    });

    // Clear existing items
    this.items.clear();
    this.showRequirements = [];

    // Add items from template
    if (template.items) {
      template.items.forEach((item, index) => {
        this.addItem(item);
        this.showRequirements[index] = false;
      });
    }
  }

  get items(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  getItemFormGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  addItem(itemData?: ChecklistItem): void {
    const photoReqs = itemData?.photo_requirements || {};
    
    const itemForm = this.fb.group({
      title: [itemData?.title || '', Validators.required],
      description: [itemData?.description || ''],
      is_required: [itemData?.is_required !== false], // Default to true
      min_photos: [itemData?.min_photos || photoReqs.min_photos || 0, [Validators.min(0), Validators.max(50)]],
      max_photos: [itemData?.max_photos || photoReqs.max_photos || 10, [Validators.min(1), Validators.max(50)]],
      photo_requirements: this.fb.group({
        angle: [photoReqs.angle || ''],
        distance: [photoReqs.distance || ''],
        lighting: [photoReqs.lighting || ''],
        focus: [photoReqs.focus || '']
      })
    }, { validators: this.photoLimitValidator });

    const itemIndex = this.items.length;
    this.items.push(itemForm);
    this.showRequirements.push(false);

    // Initialize sample images for this item
    if (itemData?.sample_images && Array.isArray(itemData.sample_images)) {
      this.sampleImages[itemIndex] = itemData.sample_images.map((img, idx) => ({
        id: img.id || `img_${Date.now()}_${idx}`,
        url: img.url || '',
        label: img.label || `Sample ${idx + 1}`,
        description: img.description || '',
        type: img.type || 'photo',
        is_primary: img.is_primary || idx === 0,
        order_index: idx,
        status: 'loaded'
      }));
    } else {
      this.sampleImages[itemIndex] = [];
    }
  }

  addQuickItem(type: 'serial' | 'label' | 'assembly' | 'damage'): void {
    const quickItems = {
      serial: {
        title: 'Serial Number Photo',
        description: 'Take a clear photo of the serial number tag',
        is_required: true,
        min_photos: 1,
        max_photos: 2,
        photo_requirements: {
          angle: 'front',
          distance: 'close',
          lighting: 'good',
          focus: 'serial_number'
        }
      },
      label: {
        title: 'Label/Tag Photo',
        description: 'Photo of identification labels and certification tags',
        is_required: true,
        min_photos: 1,
        max_photos: 3,
        photo_requirements: {
          angle: 'front',
          distance: 'close',
          lighting: 'good',
          focus: 'labels'
        }
      },
      assembly: {
        title: 'Assembly Overview',
        description: 'Wide shot showing overall assembly and connections',
        is_required: false,
        min_photos: 1,
        max_photos: 5,
        photo_requirements: {
          angle: '',
          distance: 'wide',
          lighting: 'good',
          focus: 'overall_assembly'
        }
      },
      damage: {
        title: 'Damage Inspection',
        description: 'Document any visible damage, scratches, or defects',
        is_required: false,
        min_photos: 0,
        max_photos: 10,
        photo_requirements: {
          angle: '',
          distance: 'close',
          lighting: 'bright',
          focus: 'damage_areas'
        }
      }
    };

    const quickItemData = quickItems[type];
    this.addItem(quickItemData as any);
  }

  // Custom validator to ensure min_photos <= max_photos
  photoLimitValidator(control: AbstractControl): ValidationErrors | null {
    const minPhotos = control.get('min_photos')?.value;
    const maxPhotos = control.get('max_photos')?.value;
    
    if (minPhotos !== null && maxPhotos !== null && minPhotos > maxPhotos) {
      return { photoLimitInvalid: true };
    }
    
    return null;
  }

  removeItem(index: number): void {
    if (confirm('Are you sure you want to remove this item?')) {
      this.items.removeAt(index);
      this.showRequirements.splice(index, 1);
    }
  }

  toggleRequirements(index: number): void {
    this.showRequirements[index] = !this.showRequirements[index];
  }

  onItemDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const itemsArray = this.items;
      const item = itemsArray.at(event.previousIndex);
      itemsArray.removeAt(event.previousIndex);
      itemsArray.insert(event.currentIndex, item);
      
      // Update showRequirements array
      moveItemInArray(this.showRequirements, event.previousIndex, event.currentIndex);
    }
  }

  // ==============================================
  // Image Handling Methods
  // ==============================================

  validateImageUrl(index: number, event: any): void {
    const url = event.target.value;
    if (url) {
      this.imageStatuses[index] = 'loading';
    } else {
      delete this.imageStatuses[index];
    }
  }

  onImageLoad(index: number): void {
    this.imageStatuses[index] = 'loaded';
  }

  onImageError(index: number): void {
    this.imageStatuses[index] = 'error';
  }

  getImageStatus(index: number): string {
    return this.imageStatuses[index] || 'loading';
  }

  removeImage(index: number): void {
    // Get the primary sample image for this item
    const sampleImages = this.sampleImages[index] || [];
    const primaryImage = sampleImages.find(img => img.is_primary);
    
    if (primaryImage?.url) {
      // If there's an image URL, delete it from the server
      this.photoUploadService.deleteImage(primaryImage.url).then(response => {
        if (response.success) {
          console.log('Image deleted successfully:', response.message);
        } else {
          console.warn('Failed to delete image:', response.error);
        }
      }).catch(error => {
        console.error('Error deleting image:', error);
      });
    }
    
    // Clear the sample images for this item
    delete this.sampleImages[index];
    delete this.imageStatuses[index];
    delete this.uploadingImages[index];
    
    // Clear the file input
    const fileInput = document.getElementById(`file-input-${index}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Image upload functionality
  onImageFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Use the new validation method
      const validation = this.photoUploadService.validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      
      this.uploadImage(file, index);
    }
  }

  private async uploadImage(file: File, index: number): Promise<void> {
    this.uploadingImages[index] = true;
    
    try {
      // Get the current item data
      const itemFormGroup = this.getItemFormGroup(index);
      const itemTitle = itemFormGroup.get('title')?.value || `item_${index}`;
      
      // For new templates/items, use temporary upload
      const tempId = `template_new_item_${index}_${Date.now()}`;
      
      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);
      
      if (response.success && response.url) {
        // Add to sample images array
        if (!this.sampleImages[index]) {
          this.sampleImages[index] = [];
        }
        
        const newImage = {
          id: `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: response.url,
          label: `Sample ${this.sampleImages[index].length + 1}`,
          description: '',
          type: 'photo' as const,
          is_primary: this.sampleImages[index].length === 0, // First image is primary
          order_index: this.sampleImages[index].length,
          status: 'loaded' as const
        };
        
        this.sampleImages[index].push(newImage);
        this.imageStatuses[index] = 'loaded';
        
        console.log('Image uploaded successfully:', response.url);
        
        // Show success feedback (you could replace this with a toast notification)
        this.showUploadSuccess(itemTitle, response.filename);
      } else {
        throw new Error(response.error || 'Upload failed - no URL returned');
      }
      
    } catch (error: any) {
      console.error('Image upload failed:', error);
      alert(error.error || error.message || 'Failed to upload image. Please try again.');
      this.imageStatuses[index] = 'error';
    } finally {
      this.uploadingImages[index] = false;
    }
  }

  private showUploadSuccess(itemTitle: string, filename?: string): void {
    // You could implement a toast notification service here
    // For now, we'll just log it
    console.log(`✅ Image uploaded successfully for "${itemTitle}"${filename ? ` (${filename})` : ''}`);
  }

  getFileSize(file: File): string {
    return this.photoUploadService.formatFileSize(file.size);
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('border-success');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('border-success');
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('border-success');
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.uploadImage(file, index);
      } else {
        alert('Please drop an image file (JPG, PNG, GIF)');
      }
    }
  }

  triggerFileUpload(index: number): void {
    const fileInput = document.getElementById(`file-input-${index}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Keyboard shortcuts for better UX
  onModalKeydown(event: KeyboardEvent, modal: any): void {
    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (this.templateForm.valid) {
        this.saveTemplate();
        modal.close();
      }
    }
    
    // Escape to close (only if no unsaved changes or user confirms)
    if (event.key === 'Escape') {
      if (this.formChanged) {
        if (confirm('You have unsaved changes. Are you sure you want to close?')) {
          modal.dismiss();
        }
      } else {
        modal.dismiss();
      }
    }
  }

  previewImage(imageUrl: string): void {
    if (imageUrl) {
      // Reset preview state
      this.currentPreviewImage = imageUrl;
      this.previewImageLoading = true;
      this.previewImageError = false;
      this.isImageZoomed = false;
      
      // Open the enhanced preview modal
      this.modalService.open(this.imagePreviewModal, {
        size: 'xl',
        centered: true,
        backdrop: 'static',
        keyboard: true,
        windowClass: 'image-preview-modal'
      });
    }
  }

  onPreviewImageLoad(event?: Event): void {
    this.previewImageLoading = false;
    this.previewImageError = false;
  }

  onPreviewImageError(event?: Event): void {
    this.previewImageLoading = false;
    this.previewImageError = true;
  }

  toggleImageZoom(): void {
    this.isImageZoomed = !this.isImageZoomed;
  }

  openImageInNewTab(): void {
    if (this.currentPreviewImage) {
      window.open(this.currentPreviewImage, '_blank');
    }
  }

  async pasteFromClipboard(index: number): Promise<void> {
    try {
      // Try to get image from clipboard first
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], `clipboard-image.${type.split('/')[1]}`, { type });
            this.uploadImage(file, index);
            return;
          }
        }
      }
      
      // Fallback to text (URL)
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        // Add URL as sample image
        if (!this.sampleImages[index]) {
          this.sampleImages[index] = [];
        }
        
        const newImage = {
          id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: text,
          label: `Sample ${this.sampleImages[index].length + 1}`,
          description: '',
          type: 'photo' as const,
          is_primary: this.sampleImages[index].length === 0,
          order_index: this.sampleImages[index].length,
          status: 'loaded' as const
        };
        
        this.sampleImages[index].push(newImage);
        this.validateImageUrl(index, { target: { value: text } });
      }
    } catch (err) {
      console.log('Failed to read clipboard contents: ', err);
    }
  }

  copyImageUrl(index: number): void {
    const sampleImages = this.sampleImages[index] || [];
    const primaryImage = sampleImages.find(img => img.is_primary);
    const url = primaryImage?.url;
    
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        // Could add a toast notification here
      });
    }
  }

  onImageUrlPaste(index: number, event: ClipboardEvent): void {
    // Additional validation can be added here if needed
    setTimeout(() => {
      const input = event.target as HTMLInputElement;
      this.validateImageUrl(index, { target: { value: input.value } });
    }, 10);
  }

  // ==============================================
  // Utility Methods
  // ==============================================

  get requiredItemsCount(): number {
    return this.items.controls.filter(control => control.get('is_required')?.value).length;
  }

  getPhotoLimitsSummary(index: number): string {
    const minPhotos = this.getItemFormGroup(index).get('min_photos')?.value || 0;
    const maxPhotos = this.getItemFormGroup(index).get('max_photos')?.value;
    
    if (minPhotos === 0 && !maxPhotos) {
      return 'No photo limits';
    } else if (minPhotos === maxPhotos) {
      return `Exactly ${minPhotos} photo${minPhotos !== 1 ? 's' : ''}`;
    } else if (maxPhotos) {
      return `${minPhotos}-${maxPhotos} photos`;
    } else {
      return `At least ${minPhotos} photo${minPhotos !== 1 ? 's' : ''}`;
    }
  }

  getItemsWithPhotoLimitsCount(): number {
    return this.items.controls.filter(control => {
      const minPhotos = control.get('min_photos')?.value;
      const maxPhotos = control.get('max_photos')?.value;
      return minPhotos > 0 || maxPhotos > 0;
    }).length;
  }

  trackByTemplateId(index: number, template: ChecklistTemplate): number {
    return template.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBySampleImage(index: number, image: SampleImage): string {
    return image.id || image.url;
  }

  // ==============================================
  // Template Search and Filter Methods
  // ==============================================

  getFilteredTemplates(): ChecklistTemplate[] {
    return this.templates.filter(template => {
      // Search filter
      if (this.templateSearch) {
        const searchTerm = this.templateSearch.toLowerCase();
        const matchesSearch = 
          template.name.toLowerCase().includes(searchTerm) ||
          (template.description || '').toLowerCase().includes(searchTerm) ||
          (template.part_number || '').toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (this.templateFilters.category && template.category !== this.templateFilters.category) {
        return false;
      }

      // Part number filter
      if (this.templateFilters.partNumber) {
        const partNumberSearch = this.templateFilters.partNumber.toLowerCase();
        if (!(template.part_number || '').toLowerCase().includes(partNumberSearch)) {
          return false;
        }
      }

      // Active/inactive filter
      if (this.templateFilters.activeOnly !== null) {
        if (template.is_active !== this.templateFilters.activeOnly) {
          return false;
        }
      }

      return true;
    });
  }

  onTemplateSearch(): void {
    // This method is called on input changes to trigger re-filtering
    // The actual filtering happens in getFilteredTemplates()
  }

  clearTemplateSearch(): void {
    this.templateSearch = '';
  }

  clearAllTemplateFilters(): void {
    this.templateSearch = '';
    this.templateFilters = {
      category: '',
      partNumber: '',
      activeOnly: null
    };
  }

  hasActiveFilters(): boolean {
    return !!(
      this.templateFilters.category ||
      this.templateFilters.partNumber ||
      this.templateFilters.activeOnly !== null
    );
  }

  highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm || !text) {
      return text;
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-warning bg-opacity-50">$1</mark>');
  }

  // ==============================================
  // Multiple Sample Images Management
  // ==============================================

  getSampleImages(itemIndex: number): SampleImage[] {
    return this.sampleImages[itemIndex] || [];
  }

  getPrimaryImage(itemIndex: number): SampleImage | null {
    const images = this.getSampleImages(itemIndex);
    return images.find(img => img.is_primary) || images[0] || null;
  }

  addSampleImage(itemIndex: number): void {
    if (!this.sampleImages[itemIndex]) {
      this.sampleImages[itemIndex] = [];
    }

    const images = this.sampleImages[itemIndex];
    
    // Initialize the upload image object
    this.currentUploadImage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: '',
      label: `Sample ${images.length + 1}`,
      description: '',
      type: images.length === 0 ? 'photo' : 'reference',
      is_primary: images.length === 0, // First image is primary by default
      order_index: images.length,
      status: 'loading'
    };
    
    this.currentUploadItemIndex = itemIndex;
    this.currentImageUploading = false;

    // Open the upload modal
    this.modalService.open(this.sampleImageUploadModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: true
    });
  }

  removeSampleImage(itemIndex: number, imageIndex: number): void {
    if (!this.sampleImages[itemIndex]) return;

    const images = this.sampleImages[itemIndex];
    const imageToRemove = images[imageIndex];

    if (imageToRemove && confirm('Are you sure you want to remove this sample image?')) {
      // Delete from server if it's uploaded
      if (imageToRemove.url && !imageToRemove.url.startsWith('data:')) {
        this.photoUploadService.deleteImage(imageToRemove.url).catch(error => {
          console.error('Error deleting image:', error);
        });
      }

      // Remove from array
      images.splice(imageIndex, 1);

      // If removed image was primary, make first image primary
      if (imageToRemove.is_primary && images.length > 0) {
        images[0].is_primary = true;
      }

      // Update order indices
      images.forEach((img, idx) => {
        img.order_index = idx;
      });
    }
  }

  setPrimaryImage(itemIndex: number, imageIndex: number): void {
    const images = this.getSampleImages(itemIndex);
    
    // Remove primary flag from all images
    images.forEach(img => img.is_primary = false);
    
    // Set the selected image as primary
    if (images[imageIndex]) {
      images[imageIndex].is_primary = true;
    }
  }

  setSampleImageType(itemIndex: number, imageIndex: number, type: string): void {
    const images = this.getSampleImages(itemIndex);
    if (images[imageIndex]) {
      images[imageIndex].type = type as any;
    }
  }

  onSampleImageLoad(itemIndex: number, imageIndex: number, event?: Event): void {
    const images = this.getSampleImages(itemIndex);
    if (images[imageIndex]) {
      images[imageIndex].status = 'loaded';
    }
  }

  onSampleImageError(itemIndex: number, imageIndex: number, event?: Event): void {
    const images = this.getSampleImages(itemIndex);
    if (images[imageIndex]) {
      images[imageIndex].status = 'error';
    }
  }

  previewSampleImages(itemIndex: number, startIndex: number = 0): void {
    const images = this.getSampleImages(itemIndex);
    if (images.length === 0) return;

    this.currentPreviewImages = images;
    this.currentPreviewIndex = startIndex;
    this.currentPreviewImage = images[startIndex].url;
    this.previewImageLoading = true;
    this.previewImageError = false;
    this.isImageZoomed = false;

    // Open the enhanced preview modal
    this.modalService.open(this.imagePreviewModal, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      keyboard: true,
      windowClass: 'image-preview-modal'
    });
  }

  nextPreviewImage(): void {
    if (this.currentPreviewImages.length === 0) return;
    
    this.currentPreviewIndex = (this.currentPreviewIndex + 1) % this.currentPreviewImages.length;
    this.currentPreviewImage = this.currentPreviewImages[this.currentPreviewIndex].url;
    this.previewImageLoading = true;
    this.previewImageError = false;
    this.isImageZoomed = false;
  }

  previousPreviewImage(): void {
    if (this.currentPreviewImages.length === 0) return;
    
    this.currentPreviewIndex = this.currentPreviewIndex === 0 
      ? this.currentPreviewImages.length - 1 
      : this.currentPreviewIndex - 1;
    this.currentPreviewImage = this.currentPreviewImages[this.currentPreviewIndex].url;
    this.previewImageLoading = true;
    this.previewImageError = false;
    this.isImageZoomed = false;
  }

  getCurrentPreviewImageInfo(): SampleImage | null {
    return this.currentPreviewImages[this.currentPreviewIndex] || null;
  }

  openImageUploadModal(itemIndex: number, imageIndex: number): void {
    // This would open a modal for uploading/setting URL for the specific image
    // For now, we'll use a simple prompt
    const url = prompt('Enter image URL or upload via file selector:');
    if (url) {
      const images = this.getSampleImages(itemIndex);
      if (images[imageIndex]) {
        images[imageIndex].url = url;
        images[imageIndex].status = 'loading';
      }
    }
  }

  // ==============================================
  // Sample Image Upload Modal Methods
  // ==============================================

  triggerSampleImageUpload(): void {
    const fileInput = document.getElementById('sample-image-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onSampleImageFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.uploadSampleImage(file);
    }
  }

  onSampleImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.uploadSampleImage(file);
      } else {
        alert('Please drop an image file (JPG, PNG, GIF, WebP)');
      }
    }
  }

  private async uploadSampleImage(file: File): Promise<void> {
    this.currentImageUploading = true;
    
    try {
      // Validate file
      const validation = this.photoUploadService.validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      
      // Create temp ID for upload
      const tempId = `sample_image_${this.currentUploadItemIndex}_${Date.now()}`;
      
      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);
      
      if (response.success && response.url) {
        this.currentUploadImage.url = response.url;
        this.currentUploadImage.status = 'loaded';
        
        console.log('Sample image uploaded successfully:', response.url);
      } else {
        throw new Error(response.error || 'Upload failed - no URL returned');
      }
      
    } catch (error: any) {
      console.error('Sample image upload failed:', error);
      alert(error.error || error.message || 'Failed to upload image. Please try again.');
      this.currentUploadImage.status = 'error';
    } finally {
      this.currentImageUploading = false;
    }
  }

  validateSampleImageUrl(): void {
    if (this.currentUploadImage.url) {
      this.currentUploadImage.status = 'loading';
      // The image load/error events will update the status
    }
  }

  onSampleImageUrlLoad(event?: Event): void {
    this.currentUploadImage.status = 'loaded';
  }

  onSampleImageUrlError(event?: Event): void {
    this.currentUploadImage.status = 'error';
  }

  addSampleImageToItem(modal: any): void {
    if (!this.currentUploadImage.url || this.currentUploadItemIndex === -1) {
      console.error('Cannot add image: missing URL or invalid item index', {
        url: this.currentUploadImage.url,
        itemIndex: this.currentUploadItemIndex
      });
      return;
    }

    // Ensure the array exists for this item index
    if (!this.sampleImages[this.currentUploadItemIndex]) {
      this.sampleImages[this.currentUploadItemIndex] = [];
    }

    const images = this.getSampleImages(this.currentUploadItemIndex);
    
    // If this is set as primary, remove primary from others
    if (this.currentUploadImage.is_primary) {
      images.forEach(img => img.is_primary = false);
    }
    
    // Generate unique ID and set order index
    const newImage = {
      ...this.currentUploadImage,
      id: this.currentUploadImage.id || `img_${Date.now()}_${images.length}`,
      order_index: images.length,
      status: 'loaded' as const
    };
    
    // Add the new image
    images.push(newImage);
    
    console.log('Image added successfully:', {
      itemIndex: this.currentUploadItemIndex,
      imageCount: images.length,
      newImage: newImage
    });
    
    // Close modal
    modal.close();
    
    // Reset upload state
    this.currentUploadImage = {
      id: '',
      url: '',
      label: '',
      description: '',
      type: 'photo',
      is_primary: false,
      order_index: 0,
      status: 'loading'
    };
    this.currentUploadItemIndex = -1;
  }

  // ==============================================
  // Version History and Tracking Methods
  // ==============================================

  viewVersionHistory(template: ChecklistTemplate): void {
    this.selectedTemplateFamily = template;
    this.loadingVersionHistory = true;
    
    // Open modal first
    const modalRef = this.modalService.open(this.versionHistoryModal, {
      size: 'lg',
      backdrop: 'static',
      windowClass: 'version-history-modal'
    });

    // Load version history
    this.loadVersionHistory(template).then(() => {
      this.loadingVersionHistory = false;
    }).catch(error => {
      console.error('Error loading version history:', error);
      this.loadingVersionHistory = false;
    });
  }

  private async loadVersionHistory(template: ChecklistTemplate): Promise<void> {
    try {
      // Get template family name (remove version suffixes)
      const familyName = this.getTemplateFamilyName(template);
      
      // Load all templates and filter by family
      const allTemplates = await this.configService.getTemplates().toPromise();
      
      // Group templates by family name and filter
      this.versionHistory = allTemplates
        .filter(t => this.getTemplateFamilyName(t) === familyName)
        .sort((a, b) => this.compareVersionNumbers(b.version, a.version)); // Newest first

      // Build template families map
      this.buildTemplateFamiliesMap();
      
    } catch (error) {
      console.error('Error loading version history:', error);
      this.versionHistory = [template]; // Fallback to current template
    }
  }

  private buildTemplateFamiliesMap(): void {
    this.templateFamilies.clear();
    
    this.templates.forEach(template => {
      const familyName = this.getTemplateFamilyName(template);
      if (!this.templateFamilies.has(familyName)) {
        this.templateFamilies.set(familyName, []);
      }
      this.templateFamilies.get(familyName)!.push(template);
    });
  }

  getTemplateFamilyName(template: ChecklistTemplate): string {
    // Remove version suffixes like "v1.2", "(v1.2)", "- v1.2", etc.
    return template.name
      .replace(/\s*[-–]\s*v?\d+\.\d+.*$/i, '')
      .replace(/\s*\(v?\d+\.\d+.*\)$/i, '')
      .replace(/\s*v?\d+\.\d+.*$/i, '')
      .trim();
  }

  getVersionFamilyCount(template: ChecklistTemplate): number {
    const familyName = this.getTemplateFamilyName(template);
    return this.templateFamilies.get(familyName)?.length || 1;
  }

  compareVersionNumbers(version1: string, version2: string): number {
    const parseVersion = (v: string) => {
      const parts = v.split('.').map(num => parseInt(num) || 0);
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);

    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    return v1.patch - v2.patch;
  }

  getVersionTypeLabel(template: ChecklistTemplate): string {
    const version = template.version;
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    
    if (major > 1) {
      return 'Major Release';
    } else if (minor > 0) {
      return 'Minor Revision';
    } else {
      return 'Initial Version';
    }
  }

  getVersionAge(template: ChecklistTemplate): string {
    const now = new Date();
    const created = new Date(template.created_at || template.updated_at);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  }

  getVersionChanges(version: ChecklistTemplate, index: number): any[] {
    if (index >= this.versionHistory.length - 1) {
      return [{ 
        icon: 'mdi-star', 
        color: '#28a745', 
        description: 'Initial version created' 
      }];
    }

    const previousVersion = this.versionHistory[index + 1];
    const changes: any[] = [];

    // Compare item counts
    const currentItems = version.item_count || 0;
    const previousItems = previousVersion.item_count || 0;
    
    if (currentItems > previousItems) {
      changes.push({
        icon: 'mdi-plus-circle',
        color: '#28a745',
        description: `Added ${currentItems - previousItems} checklist item${currentItems - previousItems !== 1 ? 's' : ''}`
      });
    } else if (currentItems < previousItems) {
      changes.push({
        icon: 'mdi-minus-circle',
        color: '#dc3545',
        description: `Removed ${previousItems - currentItems} checklist item${previousItems - currentItems !== 1 ? 's' : ''}`
      });
    }

    // Compare part numbers
    if (version.part_number !== previousVersion.part_number) {
      changes.push({
        icon: 'mdi-pencil',
        color: '#ffc107',
        description: `Part number changed: ${previousVersion.part_number || 'None'} → ${version.part_number || 'None'}`
      });
    }

    // Compare descriptions
    if (version.description !== previousVersion.description) {
      changes.push({
        icon: 'mdi-text',
        color: '#17a2b8',
        description: 'Description updated'
      });
    }

    // If no specific changes detected, show generic update
    if (changes.length === 0) {
      changes.push({
        icon: 'mdi-update',
        color: '#6c757d',
        description: 'Template configuration updated'
      });
    }

    return changes;
  }

  getActiveVersionsCount(): number {
    return this.versionHistory.filter(v => v.is_active).length;
  }

  trackByVersionId(index: number, version: ChecklistTemplate): number {
    return version.id;
  }

  // ==============================================
  // Version Actions
  // ==============================================

  viewVersionDetails(version: ChecklistTemplate): void {
    // Close version history modal and open template editor
    this.modalService.dismissAll();
    this.editTemplate(version);
  }

  compareVersionsModal(currentVersion: ChecklistTemplate): void {
    const currentIndex = this.versionHistory.findIndex(v => v.id === currentVersion.id);
    if (currentIndex >= this.versionHistory.length - 1) {
      alert('No previous version available for comparison.');
      return;
    }

    const previousVersion = this.versionHistory[currentIndex + 1];
    this.comparisonVersions = [previousVersion, currentVersion];
    this.generateComparisonChanges();

    // Open comparison modal
    this.modalService.open(this.versionComparisonModal, {
      size: 'xl',
      backdrop: 'static'
    });
  }

  private generateComparisonChanges(): void {
    this.comparisonChanges = [];
    const [older, newer] = this.comparisonVersions;

    // Compare basic fields
    const fieldsToCompare = [
      { field: 'name', label: 'Template Name' },
      { field: 'description', label: 'Description' },
      { field: 'part_number', label: 'Part Number' },
      { field: 'product_type', label: 'Product Type' },
      { field: 'category', label: 'Category' }
    ];

    fieldsToCompare.forEach(({ field, label }) => {
      const oldValue = older[field] || '';
      const newValue = newer[field] || '';
      
      if (oldValue !== newValue) {
        this.comparisonChanges.push({
          field: field,
          icon: 'mdi-pencil',
          color: '#ffc107',
          description: `${label} changed`,
          details: `"${oldValue}" → "${newValue}"`
        });
      }
    });

    // Compare item counts
    const oldItems = older.item_count || 0;
    const newItems = newer.item_count || 0;
    
    if (oldItems !== newItems) {
      const diff = newItems - oldItems;
      this.comparisonChanges.push({
        field: 'items',
        icon: diff > 0 ? 'mdi-plus-circle' : 'mdi-minus-circle',
        color: diff > 0 ? '#28a745' : '#dc3545',
        description: `Checklist items ${diff > 0 ? 'added' : 'removed'}`,
        details: `${Math.abs(diff)} item${Math.abs(diff) !== 1 ? 's' : ''} ${diff > 0 ? 'added' : 'removed'}`
      });
    }
  }

  reactivateVersion(version: ChecklistTemplate): void {
    if (version.active_instances > 0) {
      alert('Cannot reactivate a version that has active instances.');
      return;
    }

    if (confirm(`Reactivate version ${version.version}? This will make it available for new checklist instances.`)) {
      // Update the version to be active
      const updateData = { ...version, is_active: true };
      
      this.configService.updateTemplate(version.id, updateData).subscribe({
        next: () => {
          // Refresh version history
          this.loadVersionHistory(this.selectedTemplateFamily!);
          this.loadTemplates(); // Refresh main template list
        },
        error: (error) => {
          console.error('Error reactivating version:', error);
          alert('Error reactivating version. Please try again.');
        }
      });
    }
  }

  createVersionBranch(sourceVersion: ChecklistTemplate): void {
    // Close version history modal and create new template based on source
    this.modalService.dismissAll();
    
    this.configService.getTemplate(sourceVersion.id).subscribe({
      next: (fullTemplate) => {
        const branchedTemplate = {
          ...fullTemplate,
          name: `${this.getTemplateFamilyName(fullTemplate)} - Branch`,
          version: '1.0' // Start new branch at 1.0
        };
        delete branchedTemplate.id;
        
        this.openTemplateModal(branchedTemplate as ChecklistTemplate);
      },
      error: (error) => {
        console.error('Error creating version branch:', error);
        alert('Error creating version branch. Please try again.');
      }
    });
  }

  createNewVersionFromHistory(): void {
    if (!this.selectedTemplateFamily) return;
    
    // Close modal and create new version
    this.modalService.dismissAll();
    this.editTemplate(this.selectedTemplateFamily);
  }
}
