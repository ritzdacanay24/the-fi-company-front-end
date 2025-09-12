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
      <!-- Versioning Warning for Editing Existing Template -->
      <div *ngIf="editingTemplate" class="alert alert-warning d-flex align-items-center mb-3">
        <i class="mdi mdi-alert me-2"></i>
        <div>
          <strong>Version Notice:</strong> Editing this template will create a <b>new version</b>. Previous versions will remain available for reference.
        </div>
      </div>
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex align-items-center">
          <button type="button" class="btn btn-outline-secondary me-3" [routerLink]="['/quality/template-manager']">
            <i class="mdi mdi-arrow-left me-2"></i>
            Back to Templates
          </button>
          <div>
            <h4 class="mb-1">
              {{editingTemplate ? 'Edit Template' : 'Create New Template'}}
            </h4>
            <p class="text-muted mb-0" *ngIf="editingTemplate">
              {{editingTemplate.name}} - Version {{editingTemplate.version}}
            </p>
            <p class="text-muted mb-0" *ngIf="!editingTemplate">
              Create a new photo checklist template
            </p>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" (click)="cancel()" [disabled]="saving">
            <i class="mdi mdi-close me-2"></i>
            Cancel
          </button>
          <button type="button" class="btn btn-success" (click)="saveTemplate()" [disabled]="!templateForm.valid || saving">
            <i class="mdi mdi-content-save me-2"></i>
            {{saving ? 'Saving...' : (editingTemplate ? 'Save as New Version' : 'Create Template')}}
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm">
            <div class="card-body">
              <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()">
                
                <!-- Template Basic Information -->
                <div class="row mb-4">
                  <div class="col-md-6">
                    <label class="form-label fw-bold">Template Name *</label>
                    <input type="text" class="form-control" formControlName="name" placeholder="Enter template name">
                    <div class="invalid-feedback" *ngIf="templateForm.get('name')?.invalid && templateForm.get('name')?.touched">
                      Template name is required
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold">Category *</label>
                    <select class="form-select" formControlName="category">
                      <option value="">Select a category</option>
                      <option value="quality_control">Quality Control</option>
                      <option value="installation">Installation</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inspection">Inspection</option>
                    </select>
                    <div class="invalid-feedback" *ngIf="templateForm.get('category')?.invalid && templateForm.get('category')?.touched">
                      Category is required
                    </div>
                  </div>
                </div>

                <div class="row mb-4">
                  <div class="col-md-6">
                    <label class="form-label">Part Number</label>
                    <input type="text" class="form-control" formControlName="part_number" placeholder="Enter part number">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Product Type</label>
                    <input type="text" class="form-control" formControlName="product_type" placeholder="Enter product type">
                  </div>
                </div>

                <div class="mb-4">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" formControlName="description" rows="3" placeholder="Enter template description"></textarea>
                </div>

                <!-- Quality Document Section -->
                <div class="mb-4">
                  <h5 class="mb-3">Quality Document (Optional)</h5>
                  <app-quality-document-selector 
                    (selectionChange)="onQualityDocumentSelected($event)">
                  </app-quality-document-selector>
                </div>

                <!-- Checklist Items Section -->
                <div class="mb-4">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Checklist Items</h5>
                    <button type="button" class="btn btn-primary btn-sm" (click)="addItem()">
                      <i class="mdi mdi-plus me-2"></i>
                      Add Item
                    </button>
                  </div>

                  <!-- Items List -->
                  <div formArrayName="items" cdkDropList (cdkDropListDropped)="dropItem($event)">
                    <div *ngFor="let item of items.controls; let i = index" 
                         class="card mb-3" 
                         [formGroupName]="i" 
                         cdkDrag>
                      
                      <!-- Drag Handle and Header -->
                      <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                          <div class="drag-handle me-3" cdkDragHandle>
                            <i class="mdi mdi-drag-vertical text-muted"></i>
                          </div>
                          <h6 class="mb-0">Item {{i + 1}}</h6>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          <div class="form-check">
                            <input class="form-check-input" type="checkbox" formControlName="is_required" [id]="'required-' + i">
                            <label class="form-check-label" [for]="'required-' + i">
                              Required
                            </label>
                          </div>
                          <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeItem(i)">
                            <i class="mdi mdi-delete"></i>
                          </button>
                        </div>
                      </div>

                      <!-- Item Content -->
                      <div class="card-body">
                        <div class="row mb-3">
                          <div class="col-md-8">
                            <label class="form-label">Title *</label>
                            <input type="text" class="form-control" formControlName="title" placeholder="Enter item title">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label">Order</label>
                            <input type="number" class="form-control" formControlName="order_index" min="1">
                          </div>
                        </div>

                        <div class="mb-3">
                          <label class="form-label">Description</label>
                          <textarea class="form-control" formControlName="description" rows="2" placeholder="Enter item description"></textarea>
                        </div>

                        <!-- Photo Requirements -->
                        <div class="mb-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <label class="form-label mb-0">Photo Requirements</label>
                            <button type="button" class="btn btn-sm btn-outline-primary" (click)="toggleRequirements(i)">
                              <i class="mdi" [class.mdi-chevron-down]="!showRequirements[i]" [class.mdi-chevron-up]="showRequirements[i]"></i>
                              {{showRequirements[i] ? 'Hide' : 'Show'}} Requirements
                            </button>
                          </div>

                          <div *ngIf="showRequirements[i]" class="border rounded p-3 bg-light">
                            <div formGroupName="photo_requirements">
                              <div class="row mb-3">
                                <div class="col-md-3">
                                  <label class="form-label">Angle</label>
                                  <select class="form-select form-select-sm" formControlName="angle">
                                    <option value="">Any</option>
                                    <option value="front">Front</option>
                                    <option value="back">Back</option>
                                    <option value="side">Side</option>
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                    <option value="diagonal">Diagonal</option>
                                  </select>
                                </div>
                                <div class="col-md-3">
                                  <label class="form-label">Distance</label>
                                  <select class="form-select form-select-sm" formControlName="distance">
                                    <option value="">Any</option>
                                    <option value="close">Close-up</option>
                                    <option value="medium">Medium</option>
                                    <option value="far">Wide view</option>
                                  </select>
                                </div>
                                <div class="col-md-3">
                                  <label class="form-label">Lighting</label>
                                  <select class="form-select form-select-sm" formControlName="lighting">
                                    <option value="">Any</option>
                                    <option value="bright">Bright</option>
                                    <option value="normal">Normal</option>
                                    <option value="dim">Dim</option>
                                  </select>
                                </div>
                                <div class="col-md-3">
                                  <label class="form-label">Focus Area</label>
                                  <input type="text" class="form-control form-control-sm" formControlName="focus" placeholder="e.g., connector pins">
                                </div>
                              </div>

                              <div class="row">
                                <div class="col-md-6">
                                  <label class="form-label">Minimum Photos</label>
                                  <input type="number" class="form-control form-control-sm" formControlName="min_photos" min="0" max="10">
                                </div>
                                <div class="col-md-6">
                                  <label class="form-label">Maximum Photos</label>
                                  <input type="number" class="form-control form-control-sm" formControlName="max_photos" min="0" max="10">
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Sample Images -->
                        <div class="mb-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <label class="form-label mb-0">Sample Image</label>
                            <button type="button" class="btn btn-sm btn-outline-primary" 
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
                                      class="btn btn-sm btn-danger position-absolute top-0 end-0"
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

                <!-- Active Status -->
                <div class="mb-4">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" formControlName="is_active" id="activeStatus">
                    <label class="form-check-label" for="activeStatus">
                      <strong>Template is Active</strong>
                      <small class="text-muted d-block">Active templates are available for creating new checklist instances</small>
                    </label>
                  </div>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sample Image Upload Modal (keeping existing modal for now) -->
    <!-- Add your existing modal templates here -->
  `,
  styleUrls: []
})
export class ChecklistTemplateEditorComponent implements OnInit {
  templateForm: FormGroup;
  editingTemplate: ChecklistTemplate | null = null;
  saving = false;
  loading = false;
  uploadingImage = false;
  showRequirements: boolean[] = [];
  selectedQualityDocument: QualityDocumentSelection | null = null;
  
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
    private cdr: ChangeDetectorRef
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
      sample_image_url: [item?.sample_image_url || item?.sample_images?.[0]?.url || null] // Use sample_image_url or first sample_images URL
    });
  }

  addItem(): void {
    this.items.push(this.createItemFormGroup());
    this.showRequirements.push(false);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
    this.showRequirements.splice(index, 1);
    delete this.sampleImages[index];
  }

  toggleRequirements(index: number): void {
    this.showRequirements[index] = !this.showRequirements[index];
  }

  dropItem(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.items.controls, event.previousIndex, event.currentIndex);
    moveItemInArray(this.showRequirements, event.previousIndex, event.currentIndex);
    
    // Update order_index for all items
    this.items.controls.forEach((control, index) => {
      control.get('order_index')?.setValue(index + 1);
    });
  }

  onQualityDocumentSelected(document: QualityDocumentSelection | null): void {
    this.selectedQualityDocument = document;
    // Update the form control with the selected document ID
    this.templateForm.get('quality_document_id')?.setValue(document?.documentId || null);
    console.log('Quality document selected:', document);
  }

  getSampleImage(itemIndex: number): SampleImage | null {
    const image = this.sampleImages[itemIndex] || null;
    console.log(`getSampleImage(${itemIndex}) called, returning:`, image);
    return image;
  }

  hasSampleImage(itemIndex: number): boolean {
    return this.sampleImages[itemIndex] != null;
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
}
