import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="col-lg-6">
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-header bg-primary text-white py-3">
          <h6 class="mb-0 fw-bold">
            <i class="mdi mdi-camera me-2"></i>
            Your Photos ({{photos.length}})
          </h6>
        </div>
        
        <div class="card-body p-4">
          <!-- Photo Grid -->
          <div class="row g-3 mb-4" *ngIf="photos.length > 0; else noPhotos">
            <div class="col-6 col-md-4" *ngFor="let photo of photos; let i = index">
              <div class="position-relative">
                <img [src]="photo" 
                     class="img-fluid rounded shadow-sm cursor-pointer"
                     style="aspect-ratio: 1; object-fit: cover; width: 100%;"
                     (click)="onPhotoClick(i)"
                     [alt]="'Photo ' + (i + 1)">
                
                <!-- Delete Button -->
                <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-1"
                        style="width: 28px; height: 28px; font-size: 0.7rem;"
                        (click)="onDeletePhoto(i)"
                        [disabled]="disabled">
                  <i class="mdi mdi-close"></i>
                </button>
              </div>
            </div>
          </div>
          
          <ng-template #noPhotos>
            <div class="text-center py-5">
              <i class="mdi mdi-camera-outline text-muted mb-3" style="font-size: 3rem;"></i>
              <p class="text-muted mb-0">No photos taken yet</p>
              <small class="text-muted">Tap the camera button below to get started</small>
            </div>
          </ng-template>
          
          <!-- Upload Controls -->
          <div class="d-grid gap-2">
            <button class="btn btn-primary btn-lg rounded-pill"
                    (click)="onTakePhoto()"
                    [disabled]="disabled">
              <i class="mdi mdi-camera me-2"></i>
              Take Photo
            </button>
            
            <button class="btn btn-outline-primary rounded-pill"
                    (click)="onSelectFile()"
                    [disabled]="disabled">
              <i class="mdi mdi-file-image me-2"></i>
              Choose from Gallery
            </button>
          </div>
          
          <!-- Hidden File Input -->
          <input type="file" 
                 #fileInput 
                 accept="image/*" 
                 style="display: none;"
                 (change)="onFileSelected($event)">
        </div>
      </div>
    </div>
  `
})
export class PhotoSectionComponent {
  @Input() photos: string[] = [];
  @Input() disabled: boolean = false;
  
  @Output() takePhoto = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() photoClick = new EventEmitter<number>();
  @Output() deletePhoto = new EventEmitter<number>();
  
  onTakePhoto() {
    this.takePhoto.emit();
  }
  
  onSelectFile() {
    // Trigger file input click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }
  
  onFileSelected(event: Event) {
    this.fileSelected.emit(event);
  }
  
  onPhotoClick(index: number) {
    this.photoClick.emit(index);
  }
  
  onDeletePhoto(index: number) {
    this.deletePhoto.emit(index);
  }
}
