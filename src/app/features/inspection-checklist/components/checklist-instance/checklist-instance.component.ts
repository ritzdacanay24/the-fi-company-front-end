import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

import { 
  ChecklistTemplate, 
  ChecklistInstance, 
  ChecklistInstanceItem, 
  InspectionPhoto,
  ChecklistItem 
} from '../../models/checklist-template.interface';
import { ChecklistTemplateMockService } from '../../services/checklist-template-mock.service';

interface PhotoUpload {
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
}

@Component({
  selector: 'app-checklist-instance',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [ChecklistTemplateMockService],
  templateUrl: './checklist-instance.component.html',
  styleUrls: ['./checklist-instance.component.scss']
})
export class ChecklistInstanceComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('signaturePad') signaturePad!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();

  // Data properties
  template?: ChecklistTemplate;
  instance?: ChecklistInstance;
  isLoading = false;
  isSaving = false;
  isSubmitting = false;

  // UI state
  currentItemIndex = 0;
  showAllItems = false;
  showPhotoCapture = false;
  showSignature = false;
  currentPhotoItem?: ChecklistInstanceItem;

  // Image preview modal
  showImagePreview = false;
  previewImageUrl: string = '';

  // Full checklist overview modal
  showFullChecklistModal = false;

  // Forms
  itemForm!: FormGroup;
  signatureForm!: FormGroup;

  // Photo handling
  pendingPhotos: Map<string, PhotoUpload[]> = new Map();
  cameraStream?: MediaStream;

  // Validation and progress
  completedItems = 0;
  totalItems = 0;
  progressPercentage = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private checklistService: ChecklistTemplateMockService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const instanceId = params.get('instanceId');
      const templateId = params.get('templateId');

      if (instanceId) {
        this.loadInstance(instanceId);
      } else if (templateId) {
        this.createNewInstance(templateId);
      } else {
        this.router.navigate(['../dashboard'], { relativeTo: this.route });
      }
    });

    // Subscribe to query params for current item index
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(queryParams => {
      const itemIndex = queryParams['item'];
      if (itemIndex !== undefined && !isNaN(+itemIndex)) {
        this.currentItemIndex = +itemIndex;
        this.loadCurrentItem();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
  }

  private initializeForms(): void {
    this.itemForm = this.fb.group({
      value: [''],
      notes: [''],
      status: ['pending']
    });

    this.signatureForm = this.fb.group({
      signature: ['', Validators.required],
      notes: ['']
    });
  }

  // Data loading methods
  private loadInstance(instanceId: string): void {
    this.isLoading = true;
    
    this.checklistService.getInstance(instanceId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (instance) => {
        this.instance = instance;
        this.template = instance.template;
        this.calculateProgress();
        this.loadCurrentItem();
      },
      error: (error) => {
        console.error('Error loading instance:', error);
        this.router.navigate(['../dashboard'], { relativeTo: this.route });
      }
    });
  }

  private createNewInstance(templateId: string): void {
    this.isLoading = true;
    
    this.checklistService.getTemplate(templateId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (template) => {
        this.template = template;
        
        // Create new instance
        const newInstance = {
          templateId: template.id,
          assignedTo: 'current-user', // This would come from auth service
          location: '',
          workOrderId: '',
          notes: ''
        };

        this.checklistService.createInstance(newInstance).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (instance) => {
            this.instance = instance;
            this.calculateProgress();
            this.loadCurrentItem();
          },
          error: (error) => {
            console.error('Error creating instance:', error);
            this.router.navigate(['../dashboard'], { relativeTo: this.route });
          }
        });
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.router.navigate(['../dashboard'], { relativeTo: this.route });
      }
    });
  }

  private calculateProgress(): void {
    if (!this.instance || !this.template) return;

    this.totalItems = this.instance.items.length;
    
    // Count items as completed if:
    // 1. Status is 'completed' or 'skipped'
    // 2. For photo-type items: has at least one photo
    // 3. For other types: has a value
    this.completedItems = this.instance.items.filter((item, index) => {
      const templateItem = this.template?.items[index];
      
      // Check explicit status first
      if (item.status === 'completed' || item.status === 'skipped') {
        return true;
      }
      
      // For photo type items, check if photos exist
      if (templateItem?.type === 'photo') {
        return item.photos && item.photos.length > 0;
      }
      
      // For other types, check if value exists
      return item.value !== undefined && item.value !== null && item.value !== '';
    }).length;
    
    this.progressPercentage = this.totalItems > 0 ? 
      (this.completedItems / this.totalItems) * 100 : 0;
  }

  private loadCurrentItem(): void {
    if (!this.instance || this.currentItemIndex >= this.instance.items.length) return;

    const currentItem = this.instance.items[this.currentItemIndex];
    this.itemForm.patchValue({
      value: currentItem.value || '',
      notes: currentItem.notes || '',
      status: currentItem.status
    });
  }

  // Navigation methods
  goToNextItem(): void {
    if (this.currentItemIndex < this.totalItems - 1) {
      this.saveCurrentItem();
      this.currentItemIndex++;
      this.loadCurrentItem();
      this.updateUrlWithCurrentItem();
    }
  }

  goToPreviousItem(): void {
    if (this.currentItemIndex > 0) {
      this.saveCurrentItem();
      this.currentItemIndex--;
      this.loadCurrentItem();
      this.updateUrlWithCurrentItem();
    }
  }

  goToItem(index: number): void {
    if (index >= 0 && index < this.totalItems && index !== this.currentItemIndex) {
      this.saveCurrentItem();
      this.currentItemIndex = index;
      this.loadCurrentItem();
      this.updateUrlWithCurrentItem();
    }
  }

  private updateUrlWithCurrentItem(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { item: this.currentItemIndex },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // Item management methods
  getCurrentItem(): ChecklistInstanceItem | undefined {
    return this.instance?.items[this.currentItemIndex];
  }

  getCurrentTemplateItem(): ChecklistItem | undefined {
    return this.template?.items[this.currentItemIndex];
  }

  saveCurrentItem(): void {
    if (!this.instance || !this.itemForm.valid) return;

    const currentItem = this.getCurrentItem();
    if (!currentItem) return;

    const formValue = this.itemForm.value;
    
    this.checklistService.updateInstanceItem(
      this.instance.id,
      currentItem.id,
      {
        value: formValue.value,
        notes: formValue.notes,
        status: formValue.status
      }
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updatedItem) => {
        const itemIndex = this.instance!.items.findIndex(item => item.id === updatedItem.id);
        if (itemIndex >= 0) {
          this.instance!.items[itemIndex] = updatedItem;
          this.calculateProgress();
        }
      },
      error: (error) => {
        console.error('Error saving item:', error);
      }
    });
  }

  completeCurrentItem(): void {
    if (!this.instance) return;

    const currentItem = this.getCurrentItem();
    if (!currentItem) return;

    this.isSaving = true;

    this.checklistService.completeInstanceItem(
      this.instance.id,
      currentItem.id,
      this.itemForm.value.notes
    ).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (updatedItem) => {
        const itemIndex = this.instance!.items.findIndex(item => item.id === updatedItem.id);
        if (itemIndex >= 0) {
          this.instance!.items[itemIndex] = updatedItem;
          this.calculateProgress();
          
          // Auto-advance to next item if available
          if (this.currentItemIndex < this.totalItems - 1) {
            this.goToNextItem();
          }
        }
      },
      error: (error) => {
        console.error('Error completing item:', error);
      }
    });
  }

  markAsVerified(): void {
    if (!this.instance) return;

    const currentItem = this.getCurrentItem();
    if (!currentItem) return;

    // Mark item as verified without requiring photos
    currentItem.status = 'completed';
    currentItem.notes = this.itemForm.value.notes || 'Verified without photos';
    
    // Save the item
    this.saveCurrentItem();
    
    // Auto-advance to next item if available
    if (this.currentItemIndex < this.totalItems - 1) {
      setTimeout(() => {
        this.goToNextItem();
      }, 300);
    }
  }

  toggleVerification(): void {
    if (!this.instance) return;

    const currentItem = this.getCurrentItem();
    if (!currentItem) return;

    if (currentItem.status === 'completed') {
      // Unmark verification - reset to pending
      currentItem.status = 'pending';
      currentItem.notes = this.itemForm.value.notes || '';
    } else {
      // Mark as verified
      currentItem.status = 'completed';
      currentItem.notes = this.itemForm.value.notes || 'Verified without photos';
      
      // Auto-advance to next item if available
      if (this.currentItemIndex < this.totalItems - 1) {
        setTimeout(() => {
          this.goToNextItem();
        }, 300);
      }
    }
    
    // Save the item
    this.saveCurrentItem();
  }

  skipCurrentItem(): void {
    if (!this.instance) return;

    const currentItem = this.getCurrentItem();
    if (!currentItem) return;

    const reason = prompt('Please provide a reason for skipping this item:');
    if (!reason) return;

    this.isSaving = true;

    this.checklistService.skipInstanceItem(
      this.instance.id,
      currentItem.id,
      reason
    ).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (updatedItem) => {
        const itemIndex = this.instance!.items.findIndex(item => item.id === updatedItem.id);
        if (itemIndex >= 0) {
          this.instance!.items[itemIndex] = updatedItem;
          this.calculateProgress();
          
          // Auto-advance to next item if available
          if (this.currentItemIndex < this.totalItems - 1) {
            this.goToNextItem();
          }
        }
      },
      error: (error) => {
        console.error('Error skipping item:', error);
      }
    });
  }

  // Photo handling methods
  openPhotoCapture(item: ChecklistInstanceItem): void {
    this.currentPhotoItem = item;
    this.showPhotoCapture = true;
  }

  closePhotoCapture(): void {
    this.showPhotoCapture = false;
    this.currentPhotoItem = undefined;
    this.stopCamera();
  }

  async startCamera(): Promise<void> {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      const video = document.getElementById('cameraVideo') as HTMLVideoElement;
      if (video) {
        video.srcObject = this.cameraStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = undefined;
    }
  }

  capturePhoto(): void {
    const video = document.getElementById('cameraVideo') as HTMLVideoElement;
    const canvas = document.getElementById('photoCanvas') as HTMLCanvasElement;
    
    if (!video || !canvas || !this.currentPhotoItem) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob && this.currentPhotoItem) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.uploadPhoto(this.currentPhotoItem, file);
      }
    }, 'image/jpeg', 0.8);
  }

  onFileSelect(event: Event, item: ChecklistInstanceItem): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    this.uploadPhoto(item, file);
  }

  private uploadPhoto(item: ChecklistInstanceItem, file: File): void {
    if (!this.instance) return;

    const photoUpload: PhotoUpload = {
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
      progress: 0
    };

    // Add to pending photos
    const itemPhotos = this.pendingPhotos.get(item.id) || [];
    itemPhotos.push(photoUpload);
    this.pendingPhotos.set(item.id, itemPhotos);

    // Upload photo
    this.checklistService.uploadPhoto(
      this.instance.id,
      item.id,
      file
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (photo) => {
        photoUpload.uploading = false;
        photoUpload.progress = 100;

        // Add to item photos
        if (!item.photos) item.photos = [];
        item.photos.push(photo);

        // Remove from pending
        setTimeout(() => {
          const photos = this.pendingPhotos.get(item.id) || [];
          const index = photos.indexOf(photoUpload);
          if (index >= 0) {
            photos.splice(index, 1);
            if (photos.length === 0) {
              this.pendingPhotos.delete(item.id);
            }
          }
          URL.revokeObjectURL(photoUpload.preview);
        }, 2000);
      },
      error: (error) => {
        console.error('Error uploading photo:', error);
        photoUpload.uploading = false;
        alert('Failed to upload photo. Please try again.');
      }
    });
  }

  deletePhoto(item: ChecklistInstanceItem, photo: InspectionPhoto): void {
    if (!this.instance) return;

    if (confirm('Are you sure you want to delete this photo?')) {
      this.checklistService.deletePhoto(
        this.instance.id,
        item.id,
        photo.id
      ).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          if (item.photos) {
            const index = item.photos.findIndex(p => p.id === photo.id);
            if (index >= 0) {
              item.photos.splice(index, 1);
            }
          }
        },
        error: (error) => {
          console.error('Error deleting photo:', error);
          alert('Failed to delete photo. Please try again.');
        }
      });
    }
  }

  // Validation methods
  isItemValid(item: ChecklistInstanceItem, templateItem: ChecklistItem): boolean {
    if (!templateItem.required) return true;

    switch (templateItem.type) {
      case 'check':
        return item.status === 'completed' || item.status === 'skipped';
      
      case 'photo':
        return (item.photos && item.photos.length > 0) || item.status === 'skipped';
      
      case 'text':
      case 'number':
      case 'measure':
        return (item.value && item.value.trim() !== '') || item.status === 'skipped';
      
      default:
        return true;
    }
  }

  canSubmitInstance(): boolean {
    if (!this.instance || !this.template) return false;

    return this.instance.items.every((item, index) => {
      const templateItem = this.template!.items[index];
      return this.isItemValid(item, templateItem);
    });
  }

  // Submission methods
  submitInstance(): void {
    if (!this.instance || !this.canSubmitInstance()) return;

    this.showSignature = true;
  }

  finalizeSubmission(): void {
    if (!this.instance || !this.signatureForm.valid) return;

    this.isSubmitting = true;

    this.checklistService.submitInstance(
      this.instance.id,
      this.signatureForm.value.signature
    ).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (submittedInstance) => {
        this.instance = submittedInstance;
        alert('Inspection checklist submitted successfully!');
        this.router.navigate(['../dashboard'], { relativeTo: this.route });
      },
      error: (error) => {
        console.error('Error submitting instance:', error);
        alert('Failed to submit checklist. Please try again.');
      }
    });
  }

  // Utility methods
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'skipped': return 'badge-warning';
      case 'in-progress': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  /**
   * Get actual completion status for an item (used in modal)
   */
  isItemCompleted(item: ChecklistInstanceItem, templateItem: ChecklistItem): boolean {
    // Check explicit status first
    if (item.status === 'completed' || item.status === 'skipped') {
      return true;
    }
    
    // For photo type items, check if photos exist
    if (templateItem?.type === 'photo') {
      return item.photos ? item.photos.length > 0 : false;
    }
    
    // For other types, check if value exists
    return item.value !== undefined && item.value !== null && item.value !== '';
  }

  /**
   * Get display status for item in modal
   */
  getItemDisplayStatus(item: ChecklistInstanceItem, templateItem: ChecklistItem): string {
    if (item.status === 'skipped') return 'skipped';
    if (item.status === 'completed') return 'completed';
    
    // For photo type items, check if minimum photos are taken
    if (templateItem?.type === 'photo') {
      if (item.photos && item.photos.length > 0) {
        return 'completed';
      }
    }
    
    // For other types, check if value exists
    if (item.value !== undefined && item.value !== null && item.value !== '') {
      return 'completed';
    }
    
    return 'pending';
  }

  formatValue(value: any, templateItem: ChecklistItem): string {
    if (!value) return 'Not set';

    switch (templateItem.type) {
      case 'measure':
        return `${value} ${templateItem.unit || ''}`;
      case 'check':
        return value === 'true' || value === true ? 'Yes' : 'No';
      default:
        return value.toString();
    }
  }

  // Signature pad methods (if using a signature pad library)
  clearSignature(): void {
    // Implementation would depend on signature pad library
    this.signatureForm.patchValue({ signature: '' });
  }

  saveSignature(): void {
    // Implementation would depend on signature pad library
    // For now, just mark as signed
    this.signatureForm.patchValue({ 
      signature: `Signed at ${new Date().toISOString()}` 
    });
  }

  previewImage(imageUrl?: string): void {
    if (imageUrl) {
      this.previewImageUrl = imageUrl;
      this.showImagePreview = true;
    }
  }

  closeImagePreview(): void {
    this.showImagePreview = false;
    this.previewImageUrl = '';
  }

  openImageInNewTab(): void {
    if (this.previewImageUrl) {
      window.open(this.previewImageUrl, '_blank');
    }
  }

  // Full checklist modal methods
  openFullChecklistModal(): void {
    this.showFullChecklistModal = true;
  }

  closeFullChecklistModal(): void {
    this.showFullChecklistModal = false;
  }

  navigateToItemFromModal(index: number): void {
    this.closeFullChecklistModal();
    this.goToItem(index);
  }
}