import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NgbDropdownModule, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { PhotoChecklistConfigService, ChecklistInstance, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { GlobalComponent } from '@app/global-component';
import { AuthenticationService } from '@app/core/services/auth.service';

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
    NgbDropdownModule
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

  // Auto-advance after photo capture
  autoAdvanceAfterPhoto = false;

  // User's open checklists for offcanvas
  userOpenChecklists: ChecklistInstance[] = [];
  loadingChecklists = false;

  // Permission check
  canModifyChecklist = false;
  currentUserId: number | null = null;

  // Configuration values
  maxPhotoSizeMB = 10;
  maxVideoSizeMB = 50; // Default to 50MB for videos

  // Navigation sidebar state
  expandedNavItems: Set<number | string> = new Set();

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
    private instanceMatcher: InstanceItemMatcherService,
    private offcanvasService: NgbOffcanvas,
    private authService: AuthenticationService
  ) {
    // Get current user ID
    const currentUser = this.authService.currentUserValue;
    this.currentUserId = currentUser?.id || null;
  }

  ngOnInit(): void {
    // Load configuration values
    this.loadConfig();
    
    this.route.queryParams.subscribe(params => {
      const idParam = params['id'];
      const stepParam = params['step'];
      
      if (idParam) {
        const newInstanceId = +idParam;
        
        if (newInstanceId && !isNaN(newInstanceId) && newInstanceId > 0) {
          // Reset state when switching to a different checklist
          if (this.instanceId !== newInstanceId) {
            this.instanceId = newInstanceId;
            this.instance = null;
            this.template = null;
            this.loading = true;
          }
          
          // Update instance ID
          this.instanceId = newInstanceId;
          
          // Restore step if provided
          if (stepParam && !isNaN(+stepParam)) {
            this.currentStep = +stepParam;
          }
          
          this.loadInstance();
        } else {
          this.loading = false;
          alert('Invalid checklist instance ID. Please check the URL.');
        }
      } else {
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
      const carousels = document.querySelectorAll('.carousel');
      
      carousels.forEach((carousel) => {
        // Set up slide change event listeners
        carousel.addEventListener('slide.bs.carousel', (event: any) => {
          const slideIndex = event.to;
          const carouselId = carousel.id;
          const itemId = carouselId.replace('photoCarousel-', '');
          this.updateThumbnailHighlight(itemId, slideIndex);
        });
        
        carousel.addEventListener('slid.bs.carousel', (event: any) => {
          const slideIndex = event.to;
          const carouselId = carousel.id;
          const itemId = carouselId.replace('photoCarousel-', '');
          this.updateThumbnailHighlight(itemId, slideIndex);
        });
      });
      
    } catch (error) {
      console.error('Error initializing carousels:', error);
    }
  }

  /**
   * Check if current user has permission to modify this checklist
   */
  private checkPermission(instance: ChecklistInstance): boolean {
    if (!this.currentUserId) {
      console.error('No current user ID available');
      return false;
    }

    if (!instance.operator_id) {
      console.warn('Instance has no operator_id');
      return true; // Allow modification if no operator assigned
    }

    // Use == for comparison to handle number vs string (e.g., 3 == "3")
    return this.currentUserId == instance.operator_id;
  }

  loadConfig(): void {
    this.photoChecklistService.getConfig().subscribe({
      next: (config) => {
        // Load max file sizes from config
        const configArray = Array.isArray(config) ? config : [];
        
        const photoSizeConfig = configArray.find((c: any) => c.config_key === 'max_photo_size_mb');
        if (photoSizeConfig) {
          this.maxPhotoSizeMB = parseFloat(photoSizeConfig.config_value) || 10;
        }
        
        const videoSizeConfig = configArray.find((c: any) => c.config_key === 'max_video_size_mb');
        if (videoSizeConfig) {
          this.maxVideoSizeMB = parseFloat(videoSizeConfig.config_value) || 50;
        }
      },
      error: (error) => {
        console.error('Error loading config:', error);
        // Use defaults if config loading fails
      }
    });
  }

  loadInstance(): void {
    this.loading = true;
    this.photoChecklistService.getInstance(this.instanceId).subscribe({
      next: (instance) => {
        if (!instance) {
          this.loading = false;
          alert(`Error: Checklist instance #${this.instanceId} not found. It may have been deleted.`);
          this.router.navigate(['/quality/checklist/list']);
          return;
        }

        // Check if current user has permission to modify this checklist
        this.canModifyChecklist = this.checkPermission(instance);
        if (!this.canModifyChecklist) {
          this.loading = false;
          alert(`Access Denied: This checklist belongs to ${instance.operator_name}. You can only modify your own checklists.`);
          this.router.navigate(['/quality/checklist/execution']);
          return;
        }
        
        if (!instance.template_id) {
          this.loading = false;
          alert('Error: Checklist instance has no associated template.');
          return;
        }
        
        this.instance = instance;
        this.loadTemplate();
      },
      error: (error) => {
        console.error('Error loading instance:', error);
        this.loading = false;
        alert(`Error loading checklist instance #${this.instanceId}. It may have been deleted or you don't have permission to access it.`);
        this.router.navigate(['/quality/checklist/list']);
      }
    });
  }

  loadTemplate(): void {
    if (!this.instance) {
      console.error('Cannot load template: instance is null');
      return;
    }
    
    this.photoChecklistService.getTemplate(this.instance.template_id).subscribe({
      next: (template) => {
        if (!template) {
          this.loading = false;
          alert('Error: Template not found. Please try again.');
          return;
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

  /**
   * Flatten hierarchical items structure (with nested children) into a flat array
   * OR sort flat array with sub-items placed after their parents
   */
  private flattenItems(items: ChecklistItem[]): ChecklistItem[] {
    // Check if items are already flat (no children property)
    const hasChildren = items.some(item => (item as any).children && Array.isArray((item as any).children));
    
    if (!hasChildren) {
      // Items are already flat - just sort them properly
      // Separate parents and sub-items
      const parents = items.filter(item => item.level === 0 || !item.level);
      const subItems = items.filter(item => item.level === 1);
      
      // Build ordered array: parent followed by its sub-items
      const sorted: ChecklistItem[] = [];
      parents.forEach(parent => {
        sorted.push(parent);
        // Find and add all sub-items that belong to this parent
        const children = subItems.filter(sub => sub.parent_id === parent.id);
        sorted.push(...children);
      });
      
      return sorted;
    }
    
    // Hierarchical flattening logic with proper level assignment
    const flattened: ChecklistItem[] = [];
    
    const flatten = (item: ChecklistItem, level: number = 0, parentId?: number) => {
      // Set the level and parent_id for this item
      const flatItem = { ...item, level, parent_id: parentId };
      
      // Add the current item
      flattened.push(flatItem);
      
      // If item has children, recursively flatten them
      if ((item as any).children && Array.isArray((item as any).children)) {
        (item as any).children.forEach((child: ChecklistItem) => {
          flatten(child, level + 1, item.id);
        });
      }
    };
    
    items.forEach(item => flatten(item, 0));
    return flattened;
  }

  initializeProgress(): void {
    if (!this.template?.items) {
      return;
    }
    
    // Set instance ID in state service
    this.stateService.setInstanceId(this.instanceId);
    
    // Load completion status from localStorage
    const completionMap = this.stateService.loadFromLocalStorage();
    
    // Flatten items to include sub-items from children arrays
    const flattenedItems = this.flattenItems(this.template.items);
    
    const itemProgress: ChecklistItemProgress[] = flattenedItems.map((item, index) => {
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
      
      // Extract videos from instance item (NEW)
      const existingVideos = instanceItem?.videos?.map((v: any) => v.file_url || v.url || v) || [];
      
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
      
      // Check if item should be completed based on photos meeting requirements
      if (!completed && existingPhotos.length > 0) {
        const minPhotos = item.photo_requirements?.min_photos || 1;
        if (existingPhotos.length >= minPhotos) {
          completed = true;
          completionDate = completionDate || new Date();
        }
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
        videos: existingVideos, // Use extracted videos
        notes,
        completedAt: completionDate
      };
    });
    
    this.stateService.setItemProgress(itemProgress);
    
    // Update parent completion based on sub-items
    this.updateParentCompletion();
    
    // Navigate to first incomplete item if no step param was provided
    this.navigateToFirstIncompleteItem();
  }

  /**
   * Navigate to the first incomplete item (only if step param not in URL)
   */
  private navigateToFirstIncompleteItem(): void {
    // Only auto-navigate if step was not explicitly provided in URL
    const stepParam = this.route.snapshot.queryParams['step'];
    if (stepParam) {
      return;
    }
    
    // Find first incomplete parent item (level 0)
    const firstIncompleteIndex = this.itemProgress.findIndex(p => 
      !p.completed && (p.item.level === 0 || !p.item.level)
    );
    
    if (firstIncompleteIndex !== -1) {
      this.currentStep = firstIncompleteIndex + 1; // Steps are 1-indexed
      this.updateUrlWithCurrentStep();
    }
  }

  onFileSelectedAndUpload(event: any, itemId: number | string): void {
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
          
          // Check if all files uploaded, then trigger auto-advance
          if (uploadedCount === totalFiles) {
            this.handlePhotoUploadComplete(itemId);
          }
          
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

  /**
   * Update parent item completion based on sub-items
   * If all sub-items of a parent are complete, mark parent as complete
   */
  private updateParentCompletion(): void {
    const allProgress = this.itemProgress;
    
    // Find all parent items
    const parents = allProgress.filter(p => p.item.level === 0 || !p.item.level);
    
    parents.forEach(parent => {
      // Find all sub-items for this parent
      const subItems = allProgress.filter(sub => 
        sub.item.level === 1 && 
        (sub.item.parent_id === parent.item.id || sub.item.parent_id === (parent.item as any).baseItemId)
      );
      
      // If parent has sub-items, check if all are complete
      if (subItems.length > 0) {
        const allSubItemsComplete = subItems.every(sub => sub.completed);
        
        // Update parent completion status
        if (allSubItemsComplete && !parent.completed) {
          this.stateService.updateItemProgress(parent.item.id, {
            completed: true,
            completedAt: new Date()
          });
        } else if (!allSubItemsComplete && parent.completed) {
          // If any sub-item is incomplete, mark parent as incomplete
          this.stateService.updateItemProgress(parent.item.id, {
            completed: false,
            completedAt: undefined
          });
        }
      }
    });
  }

  saveProgress(): void {
    if (!this.instanceId) {
      console.error('Cannot save progress: Instance ID is not available');
      return;
    }

    // Update parent completion before saving
    this.updateParentCompletion();

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
        
        // Update local instance progress percentage immediately
        if (this.instance) {
          this.instance.progress_percentage = progress;
        }
        
        // Trigger change detection to update UI
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error saving progress:', error);
        this.saving = false;
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
    this.router.navigate(['/quality/checklist/execution']);
  }

  toggleItemCompletion(itemId: number | string): void {
    const itemProgress = this.stateService.findItemProgress(itemId);
    
    if (itemProgress) {
      // Check if submission requirements are met based on submission_type before marking as complete
      if (!itemProgress.completed) {
        const validation = this.photoValidation.canCompleteItem(
          itemProgress.photos.length,
          itemProgress.item,
          itemProgress.videos?.length || 0  // Pass video count for submission_type validation
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
          // Recalculate progress after photo deletion
          this.saveProgress();
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
        },
        error: (error) => {
          console.error('Error deleting photo:', error);
          alert('Error deleting photo. Please try again.');
        }
      });
    } else {
      // UI-only removal (no backend ID found) - still recalculate progress
      this.saveProgress();
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
          // Recalculate progress after removing all photos
          this.saveProgress();
          this.cdr.detectChanges();
          this.loadInstance();
        },
        error: (error) => {
          console.error('Error deleting photos:', error);
          alert('Error deleting photos. Please try again.');
        }
      });
    } else {
      // UI-only removal - still recalculate progress
      this.saveProgress();
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
          // Recalculate progress after photo deletion
          this.saveProgress();
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
        },
        error: () => {
          alert('Error deleting photo. Please try again.');
        }
      });
    } else {
      // Recalculate progress for local deletion
      this.saveProgress();
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
      const carouselId = `photoCarousel-${itemId}`;
      const carouselElement = document.getElementById(carouselId);
      
      if (carouselElement) {
        // Try different approaches to control the carousel
        
        // Method 1: Direct Bootstrap API
        if ((window as any).bootstrap?.Carousel) {
          const carousel = (window as any).bootstrap.Carousel.getOrCreateInstance(carouselElement);
          carousel.to(slideIndex);
        }
        // Method 2: jQuery if available
        else if ((window as any).$ && (window as any).$().carousel) {
          (window as any).$(`#${carouselId}`).carousel(slideIndex);
        }
        // Method 3: Manual slide activation
        else {
          this.activateCarouselSlide(carouselElement, slideIndex);
        }
        
        // Update thumbnail highlighting
        this.updateThumbnailHighlight(itemId, slideIndex);
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
    // Use the compound ID directly as the key for isCompareMode
    this.isCompareMode[itemId as any] = !this.isCompareMode[itemId as any];
    
    if (this.isCompareMode[itemId as any] && !this.comparisonPhotoIndex[itemId as any]) {
      this.comparisonPhotoIndex[itemId as any] = 0;
    }
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

  /**
   * Get total parent items count for navigation
   */
  getTotalParentItemsCount(): number {
    return this.stateService.getTotalParentItemsCount();
  }

  goToItem(itemNumber: number): void {
    this.currentStep = itemNumber;
    this.updateUrlWithCurrentStep();
  }

  nextItem(): void {
    if (this.currentStep < this.getTotalParentItemsCount()) {
      this.currentStep++;
      
      // Skip sub-items since they're shown with their parent
      while (this.currentStep <= this.getTotalParentItemsCount()) {
        const nextItemProgress = this.itemProgress[this.currentStep - 1];
        if (nextItemProgress && nextItemProgress.item.level === 1) {
          this.currentStep++;
        } else {
          break;
        }
      }
      
      this.updateUrlWithCurrentStep();
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
      
      this.updateUrlWithCurrentStep();
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
    return this.currentStep === this.getTotalParentItemsCount();
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

  /**
   * Format video duration in seconds to MM:SS format
   */
  formatDuration(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ==============================================
  // Notes Auto-Save Methods
  // ==============================================

  /**
   * Handle notes change with auto-save
   */
  onNotesChange(itemId: number | string): void {
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
   * Open camera directly for photo capture
   */
  openCamera(fileInput: HTMLInputElement, itemId: number | string): void {
    // Trigger camera by setting accept to capture
    fileInput.setAttribute('capture', 'environment');
    fileInput.click();
  }

  /**
   * Open file picker for uploading existing photo
   */
  openFilePicker(fileInput: HTMLInputElement, itemId: number | string): void {
    // Remove capture attribute for regular file selection
    fileInput.removeAttribute('capture');
    fileInput.click();
  }

  /**
   * Handle photo upload completion and auto-advance if enabled
   */
  private handlePhotoUploadComplete(itemId: number | string): void {
    // If auto-advance is enabled, move to next item
    if (this.autoAdvanceAfterPhoto && !this.isLastItem()) {
      setTimeout(() => {
        this.nextItem();
      }, 500); // Small delay to show the uploaded photo
    }
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
   * Open work order information offcanvas
   */
  openWorkOrderInfo(content: any): void {
    this.offcanvasService.open(content, { 
      position: 'end',
      panelClass: 'work-order-offcanvas'
    });
  }

  /**
   * Open offcanvas to show all open checklists for current user
   */
  openUserChecklists(content: any): void {
    this.loadingChecklists = true;
    
    // Get current user's operator ID from the instance
    const currentOperatorId = this.instance?.operator_id;
    
    // Fetch all instances (no status filter to get everything)
    this.photoChecklistService.getInstances().subscribe({
      next: (instances) => {
        // Filter to show current user's checklists that are not submitted yet
        // Include: draft, in_progress, and completed (but not yet submitted)
        if (currentOperatorId) {
          this.userOpenChecklists = instances.filter(inst => 
            inst.operator_id === currentOperatorId && 
            inst.status !== 'submitted'
          );
        } else {
          this.userOpenChecklists = instances.filter(inst => 
            inst.status !== 'submitted'
          );
        }
        
        // Ensure current checklist is in the list (add it if not present)
        if (this.instance && !this.userOpenChecklists.find(inst => inst.id === this.instance!.id)) {
          this.userOpenChecklists.unshift(this.instance);
        }
        
        // Sort by updated_at (most recent first), but keep current checklist at top
        this.userOpenChecklists.sort((a, b) => {
          if (a.id === this.instanceId) return -1;
          if (b.id === this.instanceId) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        
        this.loadingChecklists = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user checklists:', error);
        // On error, at least show the current checklist
        if (this.instance) {
          this.userOpenChecklists = [this.instance];
        } else {
          this.userOpenChecklists = [];
        }
        this.loadingChecklists = false;
        this.cdr.detectChanges();
      }
    });
    
    this.offcanvasService.open(content, { 
      position: 'end',
      panelClass: 'user-checklists-offcanvas',
      backdrop: true
    });
  }

  /**
   * Navigate to a different checklist instance
   */
  switchToChecklist(instanceId: number): void {
    this.offcanvasService.dismiss();
    
    // Navigate without step param so it auto-navigates to first incomplete item
    this.router.navigate(['/quality/checklist/instance'], { 
      queryParams: { id: instanceId }
      // NOTE: No step param - this triggers auto-navigation to first incomplete item
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  /**
   * Get progress badge class for checklist item
   */
  getProgressBadgeClass(percentage: number): string {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-secondary';
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
    if (progress.completed) return 'bg-success';
    return 'bg-secondary';
  }

  /**
   * Get status text
   */
  getStatusText(progress: ChecklistItemProgress): string {
    if (progress.completed) return 'Completed';
    return 'Pending';
  }

  /**
   * Jump to a specific item in the checklist
   */
  jumpToItem(step: number, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    // Don't allow jumping in review mode
    if (this.isReviewMode) {
      return;
    }
    
    this.currentStep = step;
    this.updateUrlWithCurrentStep();
    this.cdr.detectChanges();
    
    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get item number for navigation (parent items only)
   */
  getItemNumber(progress: ChecklistItemProgress): number {
    let count = 0;
    for (const p of this.itemProgress) {
      if (!p.item.level || p.item.level === 0) {
        count++;
        if (p.item.id === progress.item.id) {
          return count;
        }
      }
    }
    return 0;
  }

  /**
   * Get child item number for navigation (e.g., "1.1", "1.2")
   */
  getChildItemNumber(progress: ChecklistItemProgress): string {
    if (!progress.item.parent_id) return '';
    
    // Find parent item
    const parentProgress = this.itemProgress.find(p => 
      p.item.order_index === progress.item.parent_id
    );
    
    if (!parentProgress) return '';
    
    const parentNum = this.getItemNumber(parentProgress);
    
    // Count child items before this one with same parent
    let childCount = 0;
    for (const p of this.itemProgress) {
      if (p.item.level === 1 && p.item.parent_id === progress.item.parent_id) {
        childCount++;
        if (p.item.id === progress.item.id) {
          return `${parentNum}.${childCount}`;
        }
      }
    }
    
    return '';
  }

  /**
   * Toggle navigation item expansion
   */
  toggleNavItem(itemId: number | string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.expandedNavItems.has(itemId)) {
      this.expandedNavItems.delete(itemId);
    } else {
      this.expandedNavItems.add(itemId);
    }
  }

  /**
   * Check if navigation item is expanded
   */
  isNavItemExpanded(itemId: number | string): boolean {
    return this.expandedNavItems.has(itemId);
  }

  /**
   * Get child items for a parent in navigation
   */
  getNavChildItems(parentProgress: ChecklistItemProgress): ChecklistItemProgress[] {
    const parentOrderIndex = parentProgress.item.order_index;
    return this.itemProgress.filter(p => 
      p.item.level === 1 && p.item.parent_id === parentOrderIndex
    );
  }

  /**
   * Check if item has children
   */
  hasNavChildren(progress: ChecklistItemProgress): boolean {
    return this.getNavChildItems(progress).length > 0;
  }

  /**
   * Check if navigation item should be visible (handles parent expansion)
   */
  isNavItemVisible(itemIndex: number): boolean {
    const progress = this.itemProgress[itemIndex];
    if (!progress) return false;

    const level = progress.item.level || 0;

    // Root items (level 0) are always visible
    if (level === 0) return true;

    // Find parent item and check if it's expanded
    for (let i = itemIndex - 1; i >= 0; i--) {
      const potentialParent = this.itemProgress[i];
      const parentLevel = potentialParent?.item.level || 0;

      // Found the direct parent (level is 1 less)
      if (parentLevel === level - 1) {
        return this.isNavItemExpanded(potentialParent.item.id) && this.isNavItemVisible(i);
      }
    }

    return false;
  }
}