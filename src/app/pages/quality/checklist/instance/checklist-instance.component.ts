import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { PhotoChecklistConfigService, ChecklistInstance, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { GlobalComponent } from '@app/global-component';

// Import sub-components
import { ChecklistHeaderComponent } from './components/checklist-header/checklist-header.component';
import { TaskDescriptionComponent } from './components/task-description/task-description.component';
import { PhotoSectionComponent } from './components/photo-section/photo-section.component';
import { SampleReferenceComponent } from './components/sample-reference/sample-reference.component';
import { ChecklistNavigationComponent } from './components/checklist-navigation/checklist-navigation.component';

// Import services
import { ChecklistStateService, ChecklistItemProgress } from './services/checklist-state.service';
import { PhotoValidationService } from './services/photo-validation.service';
import { PhotoOperationsService } from './services/photo-operations.service';
import { ItemIdExtractorService } from './services/item-id-extractor.service';
import { InstanceItemMatcherService } from './services/instance-item-matcher.service';

@Component({
  selector: 'app-checklist-instance',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    NgbDropdownModule,
    ChecklistHeaderComponent,
    TaskDescriptionComponent,
    PhotoSectionComponent,
    SampleReferenceComponent,
    ChecklistNavigationComponent
  ],
  templateUrl: './checklist-instance.component.html',
  styleUrls: [
    './checklist-instance.component.scss',
    './checklist-instance-tablet.styles.scss'
  ]
})
export class ChecklistInstanceComponent implements OnInit, AfterViewInit, OnDestroy {
  instance: ChecklistInstance | null = null;
  template: ChecklistTemplate | null = null;
  loading = true;
  saving = false;
  instanceId: number = 0;

  // Photo upload
  selectedFiles: { [itemId: number]: FileList } = {};
  uploadProgress: { [itemId: number]: number } = {};

  // UI state
  isReviewMode = false;
  largeView = false;
  currentStep = 1;

  // Photo validation errors
  photoValidationErrors: { [itemId: number]: string } = {};

  // Comparison mode state
  isCompareMode: { [itemId: string | number]: boolean } = {};
  comparisonPhotoIndex: { [itemId: string | number]: number } = {};
  
  // Alias for template binding compatibility
  get currentComparisonIndex() {
    return this.comparisonPhotoIndex;
  }

  // Notes auto-save functionality
  private notesAutoSaveTimeout: any = null;
  notesSaving = false;
  notesLastSaved: Date | null = null;

  // Image preview modal
  showImagePreview = false;
  previewImageUrl: string = '';

  // Full checklist overview modal
  showFullChecklistModal = false;

  // Expose state service property for template
  get itemProgress(): ChecklistItemProgress[] {
    return this.stateService.getItemProgress();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private photoChecklistService: PhotoChecklistConfigService,
    private cdr: ChangeDetectorRef,
    private stateService: ChecklistStateService,
    private photoValidation: PhotoValidationService,
    private photoOps: PhotoOperationsService,
    private idExtractor: ItemIdExtractorService,
    private instanceMatcher: InstanceItemMatcherService
  ) {}

  ngOnInit(): void {
    console.log('=== ChecklistInstanceComponent ngOnInit ===');
    console.log('All route params:', this.route.snapshot.params);
    console.log('All query params:', this.route.snapshot.queryParams);
    
    this.route.queryParams.subscribe(params => {
      console.log('Query params subscription triggered:', params);
      const idParam = params['id'];
      const stepParam = params['step'];
      console.log('Instance ID from query params:', idParam, 'Type:', typeof idParam);
      console.log('Step from query params:', stepParam);
      
      if (idParam) {
        this.instanceId = +idParam;
        console.log('Parsed instance ID:', this.instanceId, 'Type:', typeof this.instanceId, 'isNaN:', isNaN(this.instanceId));
        
        if (this.instanceId && !isNaN(this.instanceId) && this.instanceId > 0) {
          console.log('Valid instanceId, loading instance...');
          
          // Restore step if provided
          if (stepParam && !isNaN(+stepParam)) {
            this.currentStep = +stepParam;
            console.log('Restored step:', this.currentStep);
          }
          
          this.loadInstance();
        } else {
          console.error('Invalid instance ID:', idParam, 'Parsed:', this.instanceId);
          this.loading = false;
          alert('Invalid checklist instance ID. Please check the URL.');
        }
      } else {
        console.error('No instance ID provided in query params. Available params:', Object.keys(params));
        this.loading = false;
        alert('No checklist instance ID provided. Please check the URL.');
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialize carousels after view is rendered
    setTimeout(() => {
      this.initializeCarousels();
    }, 500);
  }

  ngOnDestroy(): void {
    // Clear any pending auto-save timeout
    if (this.notesAutoSaveTimeout) {
      clearTimeout(this.notesAutoSaveTimeout);
      this.notesAutoSaveTimeout = null;
    }
    
    // Save notes immediately before component destruction
    this.saveNotesImmediately();
  }

  private initializeCarousels(): void {
    try {
      console.log('=== Initializing carousels ===');
      
      // Find all carousel elements
      const carousels = document.querySelectorAll('.carousel');
      console.log('Found carousels:', carousels.length);
      
      carousels.forEach((carousel, index) => {
        console.log(`Initializing carousel ${index}:`, carousel.id);
        
        // Set up slide change event listeners
        carousel.addEventListener('slide.bs.carousel', (event: any) => {
          const slideIndex = event.to;
          const carouselId = carousel.id;
          const itemId = carouselId.replace('photoCarousel-', '');
          console.log('Carousel slide event:', { carouselId, itemId, slideIndex });
          
          // Update thumbnail highlighting
          this.updateThumbnailHighlight(itemId, slideIndex);
        });
        
        carousel.addEventListener('slid.bs.carousel', (event: any) => {
          const slideIndex = event.to;
          const carouselId = carousel.id;
          const itemId = carouselId.replace('photoCarousel-', '');
          console.log('Carousel slid event (after transition):', { carouselId, itemId, slideIndex });
          
          // Update thumbnail highlighting after transition
          this.updateThumbnailHighlight(itemId, slideIndex);
        });
      });
      
    } catch (error) {
      console.error('Error initializing carousels:', error);
    }
  }

  loadInstance(): void {
    this.loading = true;
    this.photoChecklistService.getInstance(this.instanceId).subscribe({
      next: (instance) => {
        console.log('=== API Response Received ===');
        console.log('Full instance response:', instance);
        console.log('Instance items:', (instance as any).items);
        if ((instance as any).items && Array.isArray((instance as any).items)) {
          (instance as any).items.forEach((item: any, index: number) => {
            console.log(`Instance Item ${index} (ID: ${item.id}):`, item);
            console.log(`  - Keys:`, Object.keys(item));
            console.log(`  - template_item_id:`, item.template_item_id);
            console.log(`  - item_id:`, item.item_id);
            console.log(`  - template_id:`, item.template_id);
            if (item.photos) {
              console.log(`  - Photos array:`, item.photos);
              item.photos.forEach((photo: any, photoIndex: number) => {
                console.log(`    Photo ${photoIndex}:`, photo);
              });
            }
          });
        }
        this.instance = instance;
        this.loadTemplate();
      },
      error: (error) => {
        console.error('Error loading instance:', error);
        this.loading = false;
        alert('Error loading checklist instance. Please try again.');
      }
    });
  }

  loadTemplate(): void {
    if (!this.instance) return;
    
    this.photoChecklistService.getTemplate(this.instance.template_id).subscribe({
      next: (template) => {
        console.log('=== Template Response Received ===');
        console.log('Full template response:', template);
        console.log('Template items:', template.items);
        if (template.items && Array.isArray(template.items)) {
          template.items.forEach((item: any, index: number) => {
            console.log(`Template Item ${index} (ID: ${item.id}):`, item);
            console.log(`  - Keys:`, Object.keys(item));
          });
        }
        this.template = template;
        this.initializeProgress();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.loading = false;
        alert('Error loading template. Please try again.');
      }
    });
  }

  initializeProgress(): void {
    if (!this.template?.items) {
      console.log('No template items available');
      return;
    }

    console.log('=== Initializing Progress ===');
    
    // Set instance ID in state service
    this.stateService.setInstanceId(this.instanceId);
    
    // Load completion status from localStorage
    const completionMap = this.stateService.loadFromLocalStorage();
    
    const itemProgress: ChecklistItemProgress[] = this.template.items.map((item, index) => {
      // Validate item ID
      if (!item.id || item.id === null || item.id === undefined) {
        console.error(`Item ${index} has invalid ID:`, item.id);
        item.id = index + 1;
      }
      
      // Find instance item using matcher service
      const instanceItem = this.instanceMatcher.findInstanceItem(
        this.instance?.items, 
        item.id
      );
      
      // Create compound unique ID
      const baseItemId = item.id;
      const itemId = this.idExtractor.createCompoundId(this.instanceId, baseItemId);
      
      // Store the base item ID
      (item as any).baseItemId = baseItemId;
      
      // Extract photos from instance item
      const existingPhotos = this.instanceMatcher.extractPhotos(instanceItem);
      
      // Get completion status from instance item
      const { isCompleted, completedAt } = this.instanceMatcher.getCompletionStatus(instanceItem);
      
      // Use localStorage data as fallback
      const localData = completionMap.get(String(itemId));
      let completed = isCompleted;
      let completionDate = completedAt;
      let notes = '';
      
      if (localData && !isCompleted) {
        completed = localData.completed;
        if (localData.completedAt) {
          completionDate = new Date(localData.completedAt);
        }
        notes = localData.notes || '';
      }
      
      return {
        item: {
          ...item,
          id: itemId,
          baseItemId: baseItemId,
          original_position: index
        } as ChecklistItem & { id: string; original_position: number; baseItemId: number },
        completed,
        photos: existingPhotos,
        notes,
        completedAt: completionDate
      };
    });
    
    this.stateService.setItemProgress(itemProgress);
    console.log('Initialized itemProgress:', itemProgress.length, 'items');
  }

  onFileSelectedAndUpload(event: any, itemId: number | string): void {
    console.log('=== onFileSelectedAndUpload called ===');
    
    // Validate itemId
    if (!this.idExtractor.isValidItemId(itemId)) {
      console.error('Invalid itemId:', itemId);
      alert('Error: Invalid item ID. Please reload the page.');
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate instance ID
    if (!this.idExtractor.isValidInstanceId(this.instanceId)) {
      console.error('Invalid instance ID:', this.instanceId);
      alert('Error: Instance ID is not available. Please reload the page.');
      return;
    }

    // Validate photo count limits
    const progress = this.stateService.findItemProgress(itemId);
    if (progress) {
      const validation = this.photoValidation.validateFileSelection(
        files, 
        progress.photos.length, 
        progress.item
      );
      
      if (!validation.valid) {
        alert(validation.error);
        event.target.value = '';
        return;
      }
    }
    
    // Store files and upload
    const numericKey = this.idExtractor.toNumericKey(itemId);
    this.selectedFiles[numericKey] = files;
    this.uploadPhotos(itemId);
  }

  uploadPhotos(itemId: number | string): void {
    const itemIdKey = this.idExtractor.toNumericKey(itemId);
    const files = this.selectedFiles[itemIdKey];
    if (!files || files.length === 0) return;

    // Validate instance and item IDs
    if (!this.idExtractor.isValidInstanceId(this.instanceId)) {
      alert('Error: Invalid instance ID. Please reload the page.');
      return;
    }

    const progressItem = this.stateService.findItemProgress(itemId);
    if (!progressItem) {
      alert('Error: Item not found. Please reload the page.');
      return;
    }

    // Get database item ID for API calls
    const dbItemId = this.idExtractor.extractBaseItemId(
      progressItem.item.id,
      (progressItem.item as any).baseItemId
    );

    // Pre-upload validation
    if (progressItem) {
      const validation = this.photoValidation.validateFileSelection(
        files,
        progressItem.photos.length,
        progressItem.item
      );
      
      if (!validation.valid) {
        alert(validation.error);
        delete this.selectedFiles[itemIdKey];
        return;
      }
    }

    this.uploadProgress[itemIdKey] = 0;
    const totalFiles = files.length;
    let uploadedCount = 0;

    const uploadNextFile = (index: number) => {
      if (index >= totalFiles) {
        delete this.uploadProgress[itemIdKey];
        delete this.selectedFiles[itemIdKey];
        this.saveProgress();
        return;
      }

      // Check limits before each upload
      const currentItem = this.stateService.findItemProgress(itemId);
      if (currentItem && !this.photoValidation.canAddMorePhotos(currentItem.photos.length, currentItem.item)) {
        delete this.uploadProgress[itemIdKey];
        delete this.selectedFiles[itemIdKey];
        alert('Maximum photos reached. Some files were not uploaded.');
        return;
      }

      const file = files[index];
      
      this.photoOps.uploadPhoto(this.instanceId, dbItemId, file).subscribe({
        next: (response) => {
          this.stateService.addPhoto(itemId, response.file_url);
          
          uploadedCount++;
          this.uploadProgress[itemIdKey] = Math.round((uploadedCount / totalFiles) * 100);
          
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
          
          uploadNextFile(index + 1);
        },
        error: (error) => {
          console.error(`Error uploading photo ${index + 1}:`, error);
          delete this.uploadProgress[itemIdKey];
          
          const errorMessage = error.error?.error || error.message || 'Upload failed';
          alert(`Error uploading photos: ${errorMessage}`);
        }
      });
    };

    uploadNextFile(0);
  }

  saveProgress(): void {
    if (!this.instanceId) {
      console.error('Cannot save progress: Instance ID is not available');
      return;
    }

    this.saving = true;
    
    const progress = this.stateService.getCompletionPercentage();
    const completionData = this.stateService.getCompletionDataForApi();
    
    const updatedData = {
      status: progress === 100 ? 'completed' as ChecklistInstance['status'] : 'in_progress' as ChecklistInstance['status'],
      progress_percentage: progress,
      updated_at: new Date().toISOString(),
      item_completion: completionData
    };

    this.photoChecklistService.updateInstance(this.instanceId, updatedData).subscribe({
      next: (response) => {
        this.saving = false;
        this.notesLastSaved = new Date();
        this.loadInstance();
      },
      error: (error) => {
        this.saving = false;
        console.error('Error saving progress:', error);
        alert('Error saving progress. Please try again.');
      }
    });
  }

  submitChecklist(): void {
    if (!this.stateService.areAllRequiredItemsCompleted()) {
      const status = this.stateService.getRequiredCompletionStatus();
      alert(`Please complete all required items. ${status.completed}/${status.total} required items completed.`);
      return;
    }

    if (confirm('Are you sure you want to submit this checklist? This action cannot be undone.')) {
      this.saving = true;
      this.saveProgress();
      
      this.photoChecklistService.updateInstanceStatus(this.instanceId, 'submitted').subscribe({
        next: (response) => {
          this.saving = false;
          alert('Checklist submitted successfully!');
          this.router.navigate(['/quality/checklist']);
        },
        error: (error) => {
          this.saving = false;
          console.error('Error submitting checklist:', error);
          alert('Error submitting checklist. Please try again.');
        }
      });
    }
  }

  getCompletionPercentage(): number {
    return this.stateService.getCompletionPercentage();
  }

  goToItemAndExitReview(itemIndex: number): void {
    this.goToItem(itemIndex);
    this.isReviewMode = false;
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  getCurrentItemsToShow(): ChecklistItemProgress[] {
    if (this.isReviewMode) {
      return this.itemProgress;
    }
    
    const currentIndex = this.currentStep - 1;
    const currentItem = this.itemProgress[currentIndex];
    
    if (!currentItem) {
      return [];
    }
    
    // If current item is a sub-item, skip it (it will be shown with its parent)
    if (currentItem.item.level === 1) {
      return [];
    }
    
    // If current item is a parent (level 0), return it along with all its children
    const itemsToShow: ChecklistItemProgress[] = [currentItem];
    
    // Debug logging
    // console.log('=== getCurrentItemsToShow DEBUG ===');
    // console.log('Current parent item:', {
    //   id: currentItem.item.id,
    //   order_index: currentItem.item.order_index,
    //   level: currentItem.item.level,
    //   title: currentItem.item.title
    // });
    
    // Find all sub-items that belong to this parent
    // Sub-items have parent_id matching the current item's order_index or id
    for (let i = currentIndex + 1; i < this.itemProgress.length; i++) {
      const nextItem = this.itemProgress[i];
      
      // console.log(`Checking item ${i}:`, {
      //   id: nextItem.item.id,
      //   order_index: nextItem.item.order_index,
      //   parent_id: nextItem.item.parent_id,
      //   level: nextItem.item.level,
      //   title: nextItem.item.title,
      //   'parent_id type': typeof nextItem.item.parent_id,
      //   'order_index type': typeof currentItem.item.order_index,
      //   'parent_id == order_index': nextItem.item.parent_id == currentItem.item.order_index,
      //   'parent_id === order_index': nextItem.item.parent_id === currentItem.item.order_index
      // });
      
      // Stop when we hit another parent item
      if (nextItem.item.level === 0 || !nextItem.item.level) {
        // console.log('Stopping - found next parent item');
        break;
      }
      
      // Check if this sub-item belongs to the current parent
      // parent_id typically matches the parent's order_index
      if (nextItem.item.level === 1 && 
          (nextItem.item.parent_id === currentItem.item.order_index || 
           nextItem.item.parent_id === currentItem.item.baseItemId)) {
        // console.log('✓ MATCH - Adding sub-item:', nextItem.item.title);
        itemsToShow.push(nextItem);
      } else {
        // console.log('✗ NO MATCH - Skipping');
      }
    }
    
    // console.log('Total items to show:', itemsToShow.length);
    // console.log('=== END DEBUG ===');
    
    return itemsToShow;
  }

  goBack(): void {
    this.router.navigate(['../checklist'], { relativeTo: this.route });
  }

  toggleItemCompletion(itemId: number | string): void {
    const itemProgress = this.stateService.findItemProgress(itemId);
    
    if (itemProgress) {
      // Check if photo requirements are met before marking as complete
      if (!itemProgress.completed) {
        const validation = this.photoValidation.canCompleteItem(
          itemProgress.photos.length,
          itemProgress.item
        );
        
        if (!validation.valid) {
          alert(validation.error);
          return;
        }
      }

      this.stateService.toggleItemCompletion(itemId);
      this.saveProgress();
    }
  }

  markAsVerified(): void {
    // Get current progress item based on currentStep
    const progress = this.itemProgress[this.currentStep - 1];
    if (!progress) return;

    // Mark as completed without requiring photos (for optional photo items)
    this.stateService.updateItemProgress(progress.item.id, {
      completed: true,
      completedAt: new Date(),
      notes: progress.notes || 'Verified without photos'
    });
    this.saveProgress();
    
    // Auto-advance to next step if available
    if (this.currentStep < this.itemProgress.length) {
      setTimeout(() => {
        this.currentStep++;
        this.updateUrlWithCurrentStep();
      }, 300);
    }
  }

  toggleVerification(): void {
    // Get current progress item based on currentStep
    const progress = this.itemProgress[this.currentStep - 1];
    if (!progress) return;

    if (progress.completed) {
      // Unmark verification - reset to incomplete
      this.stateService.updateItemProgress(progress.item.id, {
        completed: false,
        completedAt: undefined,
        notes: progress.notes || ''
      });
    } else {
      // Mark as completed without requiring photos
      this.stateService.updateItemProgress(progress.item.id, {
        completed: true,
        completedAt: new Date(),
        notes: progress.notes || 'Verified without photos'
      });
      
      // Auto-advance to next step if available
      if (this.currentStep < this.itemProgress.length) {
        setTimeout(() => {
          this.currentStep++;
          this.updateUrlWithCurrentStep();
        }, 300);
      }
    }
    
    this.saveProgress();
  }

  removePhoto(itemId: number | string, photoIndex: number): void {
    if (!confirm('Are you sure you want to remove this photo?')) return;

    const result = this.photoOps.deletePhotoByIndex(
      itemId, 
      photoIndex, 
      this.instance?.items || []
    );

    if (result) {
      result.subscribe({
        next: () => {
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
        },
        error: (error) => {
          console.error('Error deleting photo:', error);
          alert('Error deleting photo. Please try again.');
        }
      });
    } else {
      // UI-only removal (no backend ID found)
      this.cdr.detectChanges();
    }
  }

  removeAllPhotos(itemId: number | string): void {
    if (!confirm('Are you sure you want to remove all photos for this item?')) return;

    const result = this.photoOps.deleteAllPhotos(
      itemId,
      this.instance?.items || []
    );

    if (result) {
      result.subscribe({
        next: () => {
          this.cdr.detectChanges();
          this.loadInstance();
        },
        error: (error) => {
          console.error('Error deleting photos:', error);
          alert('Error deleting photos. Please try again.');
        }
      });
    } else {
      // UI-only removal
      this.cdr.detectChanges();
    }
  }

  deletePhoto(photoUrl: string, itemId: number | string): void {
    if (!confirm('Are you sure you want to remove this photo?')) return;

    const result = this.photoOps.deletePhotoByUrl(
      photoUrl,
      itemId,
      this.instance?.items || []
    );

    if (result) {
      result.subscribe({
        next: () => {
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
        },
        error: () => {
          alert('Error deleting photo. Please try again.');
        }
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  previewImage(imageUrl: string): void {
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

  goToCarouselSlide(itemId: number | string, slideIndex: number): void {
    try {
      console.log('=== goToCarouselSlide called ===');
      console.log('itemId:', itemId, 'slideIndex:', slideIndex);
      
      const carouselId = `photoCarousel-${itemId}`;
      const carouselElement = document.getElementById(carouselId);
      
      console.log('Looking for carousel element:', carouselId);
      console.log('Found element:', carouselElement);
      
      if (carouselElement) {
        // Try different approaches to control the carousel
        
        // Method 1: Direct Bootstrap API
        if ((window as any).bootstrap?.Carousel) {
          const carousel = (window as any).bootstrap.Carousel.getOrCreateInstance(carouselElement);
          console.log('Bootstrap carousel instance:', carousel);
          carousel.to(slideIndex);
        }
        // Method 2: jQuery if available
        else if ((window as any).$ && (window as any).$().carousel) {
          console.log('Using jQuery carousel');
          (window as any).$(`#${carouselId}`).carousel(slideIndex);
        }
        // Method 3: Manual slide activation
        else {
          console.log('Using manual slide activation');
          this.activateCarouselSlide(carouselElement, slideIndex);
        }
        
        // Update thumbnail highlighting
        this.updateThumbnailHighlight(itemId, slideIndex);
        
      } else {
        console.error('Carousel element not found:', carouselId);
      }
    } catch (error) {
      console.error('Error navigating carousel:', error);
    }
  }

  private activateCarouselSlide(carouselElement: Element, slideIndex: number): void {
    // Remove active class from all slides
    const slides = carouselElement.querySelectorAll('.carousel-item');
    const indicators = carouselElement.querySelectorAll('.carousel-indicators button');
    
    slides.forEach((slide, index) => {
      if (index === slideIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
    
    indicators.forEach((indicator, index) => {
      if (index === slideIndex) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-current', 'true');
      } else {
        indicator.classList.remove('active');
        indicator.removeAttribute('aria-current');
      }
    });
  }

  private updateThumbnailHighlight(itemId: number | string, activeIndex: number): void {
    try {
      const carouselContainer = document.getElementById(`carousel-${itemId}`);
      if (carouselContainer) {
        const thumbnails = carouselContainer.querySelectorAll('.photo-thumbnail');
        thumbnails.forEach((thumb, index) => {
          const thumbElement = thumb as HTMLElement;
          if (index === activeIndex) {
            thumbElement.style.borderColor = '#007bff';
            thumbElement.style.transform = 'scale(1.1)';
          } else {
            thumbElement.style.borderColor = 'transparent';
            thumbElement.style.transform = 'scale(1)';
          }
        });
      }
    } catch (error) {
      console.error('Error updating thumbnail highlight:', error);
    }
  }

  // Comparison Mode Methods
  toggleCompareMode(itemId: number | string): void {
    console.log('=== toggleCompareMode called ===');
    console.log('itemId:', itemId, 'current mode:', this.isCompareMode[itemId as any]);
    
    // Use the compound ID directly as the key for isCompareMode
    this.isCompareMode[itemId as any] = !this.isCompareMode[itemId as any];
    
    if (this.isCompareMode[itemId as any] && !this.comparisonPhotoIndex[itemId as any]) {
      this.comparisonPhotoIndex[itemId as any] = 0;
    }
    
    console.log('New compare mode:', this.isCompareMode[itemId as any]);
  }

  getCurrentComparisonPhoto(itemId: number | string): string {
    const progressItem = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    
    if (!progressItem || !progressItem.photos.length) {
      return '';
    }
    
    const index = this.comparisonPhotoIndex[itemId as any] || 0;
    return progressItem.photos[index] || progressItem.photos[0];
  }

  getCurrentComparisonIndex(itemId: number | string): number {
    return this.comparisonPhotoIndex[itemId as any] || 0;
  }

  nextComparisonPhoto(itemId: number | string): void {
    const progressItem = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    
    if (!progressItem || !progressItem.photos.length) {
      return;
    }
    
    const currentIndex = this.comparisonPhotoIndex[itemId as any] || 0;
    if (currentIndex < progressItem.photos.length - 1) {
      this.comparisonPhotoIndex[itemId as any] = currentIndex + 1;
    }
  }

  previousComparisonPhoto(itemId: number | string): void {
    const currentIndex = this.comparisonPhotoIndex[itemId as any] || 0;
    
    if (currentIndex > 0) {
      this.comparisonPhotoIndex[itemId as any] = currentIndex - 1;
    }
  }

  getTotalItemsCount(): number {
    return this.stateService.getTotalItemsCount();
  }

  goToItem(itemNumber: number): void {
    this.currentStep = itemNumber;
  }

  nextItem(): void {
    if (this.currentStep < this.getTotalItemsCount()) {
      this.currentStep++;
      
      // Skip sub-items since they're shown with their parent
      while (this.currentStep <= this.getTotalItemsCount()) {
        const nextItemProgress = this.itemProgress[this.currentStep - 1];
        if (nextItemProgress && nextItemProgress.item.level === 1) {
          this.currentStep++;
        } else {
          break;
        }
      }
    }
  }

  previousItem(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      
      // Skip sub-items since they're shown with their parent
      while (this.currentStep > 0) {
        const prevItemProgress = this.itemProgress[this.currentStep - 1];
        if (prevItemProgress && prevItemProgress.item.level === 1) {
          this.currentStep--;
        } else {
          break;
        }
      }
    }
  }

  // Missing helper methods for the template
  getCompletedItemsCount(): number {
    return this.stateService.getCompletedItemsCount();
  }

  getCurrentItemIndex(): number {
    return this.currentStep;
  }

  /**
   * Get hierarchical label for an item (e.g., "Item 1", "Sub-item 1.1")
   */
  getItemLabel(progress: ChecklistItemProgress): string {
    const index = this.itemProgress.indexOf(progress);
    
    if (progress.item.level === 1) {
      // Sub-item: find parent and calculate sub-item number
      const parentId = progress.item.parent_id;
      const parentIndex = this.itemProgress.findIndex(p => 
        p.item.id === parentId || p.item.baseItemId === parentId
      );
      
      if (parentIndex !== -1) {
        // Count how many sub-items of this parent came before this one
        let subItemNumber = 1;
        for (let i = parentIndex + 1; i < index; i++) {
          if (this.itemProgress[i].item.level === 1 && 
              (this.itemProgress[i].item.parent_id === parentId)) {
            subItemNumber++;
          }
        }
        return `Sub-item ${parentIndex + 1}.${subItemNumber}`;
      }
      return `Sub-item ${index + 1}`;
    }
    
    // Parent item: count only parent items before this one
    let parentItemNumber = 1;
    for (let i = 0; i < index; i++) {
      if (this.itemProgress[i].item.level === 0 || !this.itemProgress[i].item.level) {
        parentItemNumber++;
      }
    }
    return `Item ${parentItemNumber}`;
  }

  /**
   * Check if item is a parent/root item
   */
  isParentItem(progress: ChecklistItemProgress): boolean {
    return progress.item.level === 0 || !progress.item.level;
  }

  /**
   * Check if item is a sub-item
   */
  isSubItem(progress: ChecklistItemProgress): boolean {
    return progress.item.level === 1;
  }

  isFirstItem(): boolean {
    return this.currentStep === 1;
  }

  isLastItem(): boolean {
    return this.currentStep === this.getTotalItemsCount();
  }

  getRequiredCompletionStatus(): { completed: number; total: number } {
    return this.stateService.getRequiredCompletionStatus();
  }

  hasPhotoRequirements(photoRequirements: any): boolean {
    return this.photoValidation.hasPhotoRequirements(photoRequirements);
  }

  getPhotoRequirements(photoRequirements: any): any {
    return this.photoValidation.getPhotoRequirements(photoRequirements);
  }

  // ==============================================
  // Delegated Methods - Forward to Services
  // ==============================================

  getMinPhotos(item: ChecklistItem): number {
    return this.photoValidation.getMinPhotos(item);
  }

  getMaxPhotos(item: ChecklistItem): number {
    return this.photoValidation.getMaxPhotos(item);
  }

  isPhotoCountValid(itemId: number | string): boolean {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.isPhotoCountValid(progress.photos.length, progress.item) : false;
  }

  getPhotoCountMessage(itemId: number | string): string {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.getPhotoCountMessage(progress.photos.length, progress.item) : '';
  }

  canAddMorePhotos(itemId: number | string): boolean {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.canAddMorePhotos(progress.photos.length, progress.item) : false;
  }

  arePhotoRequirementsMet(itemId: number | string): boolean {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.arePhotoRequirementsMet(progress.photos.length, progress.item) : false;
  }

  getPhotoStatus(itemId: number | string): 'empty' | 'insufficient' | 'valid' | 'exceeded' {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.getPhotoStatus(progress.photos.length, progress.item) : 'empty';
  }

  hasValidItemId(itemId: any): boolean {
    return this.idExtractor.isValidItemId(itemId);
  }

  getFileArray(itemId: number | string): File[] {
    const numericKey = this.idExtractor.toNumericKey(itemId);
    const files = this.selectedFiles[numericKey];
    return files ? Array.from(files) : [];
  }

  getPhotoUrl(photo: string | any): string {
    return this.photoOps.getPhotoUrl(photo);
  }

  // ==============================================
  // Notes Auto-Save Methods
  // ==============================================

  /**
   * Handle notes change with auto-save
   */
  onNotesChange(itemId: number | string): void {
    console.log('Notes changed for item:', itemId);
    
    // Clear existing timeout
    if (this.notesAutoSaveTimeout) {
      clearTimeout(this.notesAutoSaveTimeout);
    }
    
    // Set new timeout for auto-save (2 seconds after user stops typing)
    this.notesAutoSaveTimeout = setTimeout(() => {
      this.saveNotesOnly();
    }, 2000);
  }

  /**
   * Save only notes data without triggering full progress save
   */
  private saveNotesOnly(): void {
    if (!this.instanceId) {
      console.error('Cannot save notes: Instance ID is not available');
      return;
    }

    console.log('Auto-saving notes...');
    this.notesSaving = true;
    
    // Save notes to localStorage immediately
    const itemCompletionData = this.itemProgress.map(p => ({
      itemId: p.item.id,
      completed: p.completed,
      completedAt: p.completedAt?.toISOString(),
      notes: p.notes || ''
    }));
    localStorage.setItem(`checklist_${this.instanceId}_completion`, JSON.stringify(itemCompletionData));
    
    // Simulate slight delay for better UX
    setTimeout(() => {
      this.notesSaving = false;
      this.notesLastSaved = new Date();
      this.cdr.detectChanges();
      console.log('Notes saved to localStorage');
    }, 300);
  }

  /**
   * Force save notes immediately
   */
  saveNotesImmediately(): void {
    if (this.notesAutoSaveTimeout) {
      clearTimeout(this.notesAutoSaveTimeout);
      this.notesAutoSaveTimeout = null;
    }
    
    // Only save if there's an instance ID
    if (this.instanceId) {
      this.saveNotesOnly();
    }
  }

  /**
   * Get the primary sample image URL from the sample_images array
   */
  getPrimarySampleImage(item: ChecklistItem): string {
  // Use sample_image_url field directly (matches backend response)
  return item.sample_image_url || '';
  }

  /**
   * Handle file selection from photo section component
   */
  onFileSelected(event: Event, itemId: number | string): void {
    this.onFileSelectedAndUpload(event, itemId);
  }

  /**
   * Update completion status when photos change
   */
  private updateCompletionStatus(progress: ChecklistItemProgress): void {
    const minPhotos = this.getMinPhotos(progress.item);
    progress.completed = progress.photos.length >= minPhotos;
    
    if (progress.completed && !progress.completedAt) {
      progress.completedAt = new Date();
    } else if (!progress.completed) {
      progress.completedAt = undefined;
    }
  }

  /**
   * Save progress silently without showing loading states
   */
  private saveProgressSilently(): void {
    if (!this.instanceId) return;
    
    const completedItems = this.itemProgress.filter(p => p.completed).length;
    const progress = Math.round((completedItems / this.itemProgress.length) * 100);
    
    const itemCompletionData = this.itemProgress.map(p => ({
      itemId: p.item.id,
      completed: p.completed,
      completedAt: p.completedAt?.toISOString(),
      notes: p.notes || ''
    }));
    
    localStorage.setItem(`checklist_${this.instanceId}_completion`, JSON.stringify(itemCompletionData));
    
    const updatedData = {
      status: progress === 100 ? 'completed' as ChecklistInstance['status'] : 'in_progress' as ChecklistInstance['status'],
      progress_percentage: progress,
      updated_at: new Date().toISOString(),
      item_completion: itemCompletionData
    };

    // Silent save - no loading states or notifications
    this.photoChecklistService.updateInstance(this.instanceId, updatedData).subscribe({
      next: () => {
        // Silent success
      },
      error: (error) => {
        console.error('Silent save failed:', error);
      }
    });
  }

  /**
   * Navigate to photo mode and go to specific item
   */
  navigateToPhotoMode(itemIndex: number): void {
    this.isReviewMode = false;
    this.currentStep = itemIndex + 1; // Convert 0-based index to 1-based step
    this.updateUrlWithCurrentStep();
  }

  /**
   * Update URL with current step for persistence
   */
  private updateUrlWithCurrentStep(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: this.instanceId, step: this.currentStep },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  /**
   * Handle sample image loading errors
   */
  onSampleImageError(event: any): void {
    console.warn('Failed to load sample image:', event.target.src);
    event.target.style.display = 'none';
  }

  /**
   * Full checklist modal methods
   */
  openFullChecklistModal(): void {
    this.showFullChecklistModal = true;
  }

  closeFullChecklistModal(): void {
    this.showFullChecklistModal = false;
  }

  navigateToItemFromModal(index: number): void {
    this.closeFullChecklistModal();
    this.navigateToPhotoMode(index);
  }

  /**
   * Format value based on item type
   */
  formatValue(notes: string): string {
    return notes || '-';
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(progress: ChecklistItemProgress): string {
    if (progress.completed || progress.photos.length > 0) return 'bg-success';
    return 'bg-secondary';
  }

  /**
   * Get status text
   */
  getStatusText(progress: ChecklistItemProgress): string {
    if (progress.completed || progress.photos.length > 0) return 'Completed';
    return 'Pending';
  }
}