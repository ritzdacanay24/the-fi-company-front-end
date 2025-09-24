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

export interface ChecklistItemProgress {
  item: ChecklistItem & { 
    id: number | string;  // Allow both number and string for compound IDs
    original_position?: number; 
    baseItemId?: number;  // Store the original item ID for reference
  };
  completed: boolean;
  photos: string[];
  notes: string;
  completedAt?: Date;
}

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
  itemProgress: ChecklistItemProgress[] = [];
  loading = true;
  saving = false;
  instanceId: number = 0; // Initialize with 0 instead of undefined

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private photoChecklistService: PhotoChecklistConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('=== ChecklistInstanceComponent ngOnInit ===');
    console.log('All route params:', this.route.snapshot.params);
    console.log('All query params:', this.route.snapshot.queryParams);
    
    this.route.queryParams.subscribe(params => {
      console.log('Query params subscription triggered:', params);
      const idParam = params['id'];
      console.log('Instance ID from query params:', idParam, 'Type:', typeof idParam);
      
      if (idParam) {
        this.instanceId = +idParam;
        console.log('Parsed instance ID:', this.instanceId, 'Type:', typeof this.instanceId, 'isNaN:', isNaN(this.instanceId));
        
        if (this.instanceId && !isNaN(this.instanceId) && this.instanceId > 0) {
          console.log('Valid instanceId, loading instance...');
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
    console.log('Template items:', this.template.items);
    console.log('Instance data:', this.instance);
    console.log('Instance items:', this.instance?.items);
    
    // Load completion status from localStorage as fallback
    const localStorageKey = `checklist_${this.instanceId}_completion`;
    const savedCompletionData = localStorage.getItem(localStorageKey);
    let completionMap: {[key: string]: {completed: boolean, completedAt?: string, notes?: string}} = {};
    
    if (savedCompletionData) {
      try {
        const parsed = JSON.parse(savedCompletionData);
        parsed.forEach((item: any) => {
          completionMap[String(item.itemId)] = {
            completed: item.completed,
            completedAt: item.completedAt,
            notes: item.notes || ''
          };
        });
        console.log('Loaded completion data from localStorage:', completionMap);
      } catch (e) {
        console.warn('Failed to parse completion data from localStorage:', e);
      }
    }
    
    this.itemProgress = this.template.items.map((item, index) => {
      console.log(`Item ${index}:`, item, 'ID:', item.id, 'Type:', typeof item.id);
      
      // Validate that the item has a valid ID
      if (!item.id || item.id === null || item.id === undefined) {
        console.error(`Item ${index} has invalid ID:`, item.id, 'Item:', item);
        // Assign a temporary ID based on index if missing
        item.id = index + 1;
        console.warn(`Assigned temporary ID ${item.id} to item ${index}`);
      }
      
      // Find the corresponding instance item first to get the correct ID for database operations
      // Try multiple strategies to match template items with instance items
      let instanceItem = null;
      
      // Only try to match if we have instance items
      if (this.instance?.items && Array.isArray(this.instance.items) && this.instance.items.length > 0) {
        // Strategy 1: Match by template_item_id field
        instanceItem = this.instance.items.find((instItem: any) => 
          String((instItem as any).template_item_id) === String(item.id)
        );
        
        // Strategy 2: Match by item_id field  
        if (!instanceItem) {
          instanceItem = this.instance.items.find((instItem: any) => 
            String((instItem as any).item_id) === String(item.id)
          );
        }
        
        // Strategy 3: Match by order_index (assuming same order)
        if (!instanceItem) {
          instanceItem = this.instance.items[index];
        }
        
        // Strategy 4: Match by direct ID (if template and instance use same IDs)
        if (!instanceItem) {
          instanceItem = this.instance.items.find((instItem: any) => 
            String(instItem.id) === String(item.id)
          );
        }
        
        console.log(`Looking for template item ${item.id} in instance items using multiple strategies:`);
        console.log('Available instance items:', this.instance.items.map(i => ({ 
          id: i.id, 
          template_item_id: (i as any).template_item_id,
          item_id: (i as any).item_id,
          order_index: (i as any).order_index,
          title: (i as any).title
        })));
        console.log(`Found instanceItem:`, instanceItem);
      } else {
        console.log('No instance items available - this is a new checklist or empty instance');
      }
      
      // Use the instance item ID for database operations, fallback to template ID
      // Create a compound unique ID using instance_id + item_id to ensure uniqueness
      const baseItemId = instanceItem?.id || item.id;
      const itemId = `${this.instanceId}_${baseItemId}`;
      console.log(`Using compound item ID: ${itemId} (instance: ${this.instanceId}, base item: ${baseItemId}) for template item ${item.id} at index ${index}`);
      
      const existingPhotos: string[] = [];
      let isCompleted = false;
      let completedAt: Date | undefined = undefined;
      
      if (instanceItem && (instanceItem as any).photos && Array.isArray((instanceItem as any).photos)) {
        // Extract photo URLs from the photos array - they're already full URLs
        (instanceItem as any).photos.forEach((photo: any) => {
          if (photo.file_url) {
            existingPhotos.push(photo.file_url);
          }
        });
        console.log(`Found ${existingPhotos.length} existing photos for item ${itemId}:`, existingPhotos);
        
        // Check if this item is marked as completed
        if ((instanceItem as any).is_completed !== undefined) {
          isCompleted = Boolean((instanceItem as any).is_completed);
        }
        
        // Check for completion timestamp
        if ((instanceItem as any).completed_at) {
          completedAt = new Date((instanceItem as any).completed_at);
        }
      } else {
        console.log(`No photos found for item ${itemId}. instanceItem:`, instanceItem);
        console.log('This is normal for new checklists or items without photos yet');
      }
      
      // Use localStorage data as fallback if backend data is not available
      const localData = completionMap[String(itemId)];
      let notes = '';
      if (localData && !isCompleted) {
        isCompleted = localData.completed;
        if (localData.completedAt) {
          completedAt = new Date(localData.completedAt);
        }
        notes = localData.notes || '';
      }
      
      // Log the specific details for debugging
      console.log(`Item ${index} details:`, {
        id: item.id,
        title: item.title,
        min_photos: item.min_photos,
        max_photos: item.max_photos,
        is_required: item.is_required,
        existing_photos_count: existingPhotos.length,
        has_instance_item: !!instanceItem
      });
      
      return {
        item: {
          ...item,
          id: itemId,  // Use the compound ID for uniqueness
          baseItemId: baseItemId, // Store the original item ID for API calls
          original_position: index  // Store original position for reference
        } as ChecklistItem & { id: string; original_position: number; baseItemId: number },
        completed: isCompleted, // Use loaded completion status
        photos: existingPhotos, // Use existing photos (empty array for new items)
        notes: notes, // Use loaded notes
        completedAt: completedAt // Use loaded completion timestamp
      };
    });
    
    console.log('Initialized itemProgress:', this.itemProgress);
    console.log('Photo counts per item:', this.itemProgress.map(p => ({
      itemId: p.item.id,
      photoCount: p.photos.length,
      photos: p.photos,
      hasInstanceData: p.photos.length > 0
    })));
    
    // Validate all items have valid IDs
    const invalidItems = this.itemProgress.filter(p => !p.item.id || p.item.id === null || p.item.id === undefined);
    if (invalidItems.length > 0) {
      console.error('Found items with invalid IDs:', invalidItems);
      alert(`Warning: ${invalidItems.length} items have invalid IDs. This may cause upload issues.`);
    } else {
      console.log('All items have valid IDs');
    }
  }

  onFileSelectedAndUpload(event: any, itemId: number | string): void {
    console.log('=== onFileSelectedAndUpload called ===');
    console.log('itemId parameter:', itemId, 'Type:', typeof itemId);
    console.log('itemId === null:', itemId === null);
    console.log('itemId === undefined:', itemId === undefined);
    console.log('JSON.stringify(itemId):', JSON.stringify(itemId));
    console.log('hasValidItemId result:', this.hasValidItemId(itemId));
    
    // Exit early if itemId is null or undefined
    if (itemId === null || itemId === undefined) {
      console.error('itemId is null or undefined, cannot proceed with upload');
      console.error('Current itemProgress array:', this.itemProgress.map(p => ({ id: p.item.id, title: p.item.title })));
      alert('Error: Item ID is not available. Please reload the page.');
      return;
    }
    
    // Check if itemId is valid using our validation function
    if (!this.hasValidItemId(itemId)) {
      console.error('itemId failed validation:', itemId);
      console.error('Validation details:', {
        isNull: itemId === null,
        isUndefined: itemId === undefined,
        isEmpty: itemId === '',
        isNaN: isNaN(Number(itemId)),
        isNotPositive: Number(itemId) <= 0
      });
      alert('Error: Invalid item ID. Please reload the page.');
      return;
    }
    
    const files = event.target.files;
    console.log('Files selected:', files?.length, 'files for item:', itemId);
    
    if (files && files.length > 0) {
      // Check instance ID
      if (!this.instanceId || this.instanceId <= 0) {
        console.error('Instance ID is not available or invalid:', this.instanceId);
        alert('Error: Instance ID is not available. Please reload the page.');
        return;
      }
      
      // Convert itemId to number if it's a string, and validate
      const numericItemId = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
      if (isNaN(numericItemId)) {
        console.error('Item ID is not a valid number:', itemId, typeof itemId);
        alert('Error: Invalid item ID. Please try again.');
        return;
      }

      // Validate photo count limits using the original compound itemId
      const validation = this.validateFileSelection(files, itemId);
      if (!validation.valid) {
        alert(validation.error);
        // Clear the file input
        event.target.value = '';
        return;
      }
      
      console.log('Validation passed, proceeding with upload...');
      // Convert to numeric key for the selectedFiles dictionary
      const numericKey = typeof itemId === 'string' ? parseInt(itemId.split('_')[1]) || 0 : itemId;
      this.selectedFiles[numericKey] = files;
      this.uploadPhotos(itemId);
    }
  }

  uploadPhotos(itemId: number | string): void {
    console.log('=== uploadPhotos called ===');
    console.log('itemId:', itemId, 'Type:', typeof itemId);
    console.log('this.instanceId:', this.instanceId);
    
    // Convert to string for dictionary lookups (since our selectedFiles uses number keys)
    const itemIdKey = typeof itemId === 'string' ? parseInt(itemId.split('_')[1]) || 0 : itemId;
    const files = this.selectedFiles[itemIdKey];
    if (!files || files.length === 0) {
      console.log('No files found, returning');
      return;
    }

    // Simple validation
    if (!this.instanceId || this.instanceId <= 0) {
      console.error('Cannot upload photos: Invalid instance ID:', this.instanceId);
      alert('Error: Invalid instance ID. Please reload the page.');
      return;
    }

    // Validate itemId (handle both string and number types)
    const numericItemId = typeof itemId === 'string' ? parseInt(itemId.split('_')[1]) || 0 : itemId;
    if (isNaN(numericItemId) || numericItemId <= 0) {
      console.error('Cannot upload photos: Invalid item ID:', itemId, 'Parsed:', numericItemId, typeof itemId);
      alert('Error: Invalid item ID. Please try again.');
      return;
    }

    // Find the progress item to get debug info
    const progressItem = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    console.log('=== DEBUG INFO ===');
    console.log('Looking for item with ID:', itemId);
    console.log('Found progress item:', progressItem);
    console.log('All item progress items:', this.itemProgress.map(p => ({ id: p.item.id, baseItemId: (p.item as any).baseItemId, title: p.item.title })));
    console.log('Template items:', this.template?.items?.map(i => ({ id: i.id, title: i.title })));

    // Get the actual database item ID for API calls
    const dbItemId = progressItem ? (progressItem.item as any).baseItemId || progressItem.item.id : itemId;
    console.log('Using database item ID for API calls:', dbItemId, 'Type:', typeof dbItemId);

    // Additional validation before starting upload
    if (progressItem) {
      const currentCount = progressItem.photos.length;
      const maxPhotos = this.getMaxPhotos(progressItem.item);
      const newCount = currentCount + files.length;
      
      console.log('Pre-upload validation:', {
        currentCount,
        maxPhotos,
        filesToUpload: files.length,
        newCount,
        wouldExceed: newCount > maxPhotos
      });
      
      if (newCount > maxPhotos) {
        alert(`Cannot upload ${files.length} photo(s). Maximum ${maxPhotos} allowed (currently ${currentCount})`);
        delete this.selectedFiles[itemId];
        return;
      }
    }

    console.log('Validation passed, starting upload process...');
    console.log('Using compound item ID for UI tracking:', itemId);
    console.log('Using numeric item ID for file access:', itemIdKey);
    
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

      const file = files[index];
      console.log('Uploading file:', file.name, 'for instance:', this.instanceId, 'compound itemId:', itemId);
      
      // Check again before each individual upload using the compound itemId
      const currentProgressItem = this.itemProgress.find(p => String(p.item.id) === String(itemId));
      if (currentProgressItem) {
        const currentCount = currentProgressItem.photos.length;
        const maxPhotos = this.getMaxPhotos(currentProgressItem.item);
        
        if (currentCount >= maxPhotos) {
          console.log('Maximum photos reached during upload, stopping at file:', index);
          delete this.uploadProgress[itemIdKey];
          delete this.selectedFiles[itemIdKey];
          alert(`Maximum ${maxPhotos} photos reached. Some files were not uploaded.`);
          return;
        }
      }
      
      // Use the database item ID for the API call
      console.log('About to call photoChecklistService.uploadPhoto with instanceId:', this.instanceId, 'dbItemId:', dbItemId);
      
      // Additional validation before API call
      if (!dbItemId || isNaN(Number(dbItemId)) || Number(dbItemId) <= 0) {
        console.error('Invalid dbItemId detected before API call:', dbItemId, 'Type:', typeof dbItemId);
        alert('Error: Invalid database item ID. Upload cancelled.');
        delete this.uploadProgress[itemIdKey];
        delete this.selectedFiles[itemIdKey];
        return;
      }
      
      this.photoChecklistService.uploadPhoto(this.instanceId, Number(dbItemId), file).subscribe({
        next: (response) => {
          console.log(`Photo ${index + 1} uploaded successfully:`, response);
          
          // Use the compound itemId to find the progress item
          const itemProgressIndex = this.itemProgress.findIndex(p => String(p.item.id) === String(itemId));
          if (itemProgressIndex >= 0) {
            if (!this.itemProgress[itemProgressIndex].photos) {
              this.itemProgress[itemProgressIndex].photos = [];
            }
            this.itemProgress[itemProgressIndex].photos.push(response.file_url);
            
            // Log updated count
            console.log('Updated photo count for compound itemId:', itemId, 'New count:', this.itemProgress[itemProgressIndex].photos.length);
            
            // Force change detection to update UI
            this.cdr.detectChanges();
            
            // Reinitialize carousels after adding photos
            setTimeout(() => {
              this.initializeCarousels();
            }, 100);
          }

          uploadedCount++;
          this.uploadProgress[itemIdKey] = Math.round((uploadedCount / totalFiles) * 100);
          
          uploadNextFile(index + 1);
        },
        error: (error) => {
          console.error(`Error uploading photo ${index + 1}:`, error);
          console.error('Full error object:', error);
          delete this.uploadProgress[itemIdKey];
          
          // Show more detailed error message
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
    
    const completedItems = this.itemProgress.filter(p => p.completed).length;
    const progress = Math.round((completedItems / this.itemProgress.length) * 100);
    
    // Save individual item completion status and notes to localStorage as backup
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
      // Include item completion data in the update
      item_completion: itemCompletionData
    };

    this.photoChecklistService.updateInstance(this.instanceId, updatedData).subscribe({
      next: (response) => {
        this.saving = false;
        this.notesLastSaved = new Date(); // Update notes saved timestamp
        console.log('Progress saved successfully:', response);
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
    const requiredItems = this.itemProgress.filter(p => p.item.is_required);
    const completedRequiredItems = requiredItems.filter(p => p.completed);
    
    if (completedRequiredItems.length < requiredItems.length) {
      alert(`Please complete all required items. ${completedRequiredItems.length}/${requiredItems.length} required items completed.`);
      return;
    }

    if (confirm('Are you sure you want to submit this checklist? This action cannot be undone.')) {
      this.saving = true;
      
      this.saveProgress();
      
      this.photoChecklistService.updateInstanceStatus(this.instanceId, 'submitted').subscribe({
        next: (response) => {
          this.saving = false;
          console.log('Checklist submitted successfully:', response);
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
    if (this.itemProgress.length === 0) return 0;
    const completed = this.itemProgress.filter(p => p.completed).length;
    return Math.round((completed / this.itemProgress.length) * 100);
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
    return this.itemProgress[currentIndex] ? [this.itemProgress[currentIndex]] : [];
  }

  goBack(): void {
    this.router.navigate(['../checklist'], { relativeTo: this.route });
  }

  toggleItemCompletion(itemId: number | string): void {
    const itemProgress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    
    if (itemProgress) {
      // When trying to mark as complete, check if photo requirements are met
      if (!itemProgress.completed && !this.arePhotoRequirementsMet(itemId)) {
        const minPhotos = this.getMinPhotos(itemProgress.item);
        if (minPhotos > 0) {
          alert(`Cannot mark as complete. This item requires at least ${minPhotos} photo${minPhotos > 1 ? 's' : ''}.`);
          return;
        }
      }

      // Toggle the completion status
      itemProgress.completed = !itemProgress.completed;
      
      if (itemProgress.completed) {
        itemProgress.completedAt = new Date();
      } else {
        itemProgress.completedAt = undefined;
      }
      
      // Save progress immediately
      this.saveProgress();
    }
  }

  removePhoto(itemId: number | string, photoIndex: number): void {
    if (confirm('Are you sure you want to remove this photo?')) {
      console.log('=== removePhoto called ===');
      console.log('itemId:', itemId, 'photoIndex:', photoIndex);
      
      const itemProgress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
      if (!itemProgress) {
        console.error('Item progress not found for itemId:', itemId);
        return;
      }
      
      if (photoIndex < 0 || photoIndex >= itemProgress.photos.length) {
        console.error('Invalid photo index:', photoIndex, 'Available photos:', itemProgress.photos.length);
        return;
      }
      
      // Find the instance item to get the actual photo object with ID
      // Extract the base item ID from compound ID for instance item lookup
      const baseItemId = (itemProgress.item as any).baseItemId || itemProgress.item.id;
      const instanceItem = this.instance?.items?.find((instItem: any) => String(instItem.id) === String(baseItemId));
      console.log('Looking for instance item with baseItemId:', baseItemId);
      console.log('Found instanceItem:', instanceItem);
      
      if (instanceItem && (instanceItem as any).photos && Array.isArray((instanceItem as any).photos)) {
        const photosData = (instanceItem as any).photos;
        console.log('Photos data:', photosData);
        
        if (photoIndex < photosData.length && photosData[photoIndex]?.id) {
          const photoToDelete = photosData[photoIndex];
          console.log('Deleting photo:', photoToDelete);
          
          // Delete from server
          this.photoChecklistService.deletePhoto(photoToDelete.id).subscribe({
            next: (response) => {
              console.log('Photo deleted successfully:', response);
              
              // Remove from local arrays
              itemProgress.photos.splice(photoIndex, 1);
              photosData.splice(photoIndex, 1);
              
              // Force change detection
              this.cdr.detectChanges();
              
              // Reinitialize carousels after removing photos
              setTimeout(() => {
                this.initializeCarousels();
              }, 100);
              
              console.log('Photo removed, remaining photos:', itemProgress.photos.length);
            },
            error: (error) => {
              console.error('Error deleting photo:', error);
              alert('Error deleting photo. Please try again.');
            }
          });
        } else {
          console.warn('Photo at index', photoIndex, 'has no ID or invalid index');
          // Just remove from UI if no ID (shouldn't happen normally)
          itemProgress.photos.splice(photoIndex, 1);
          this.cdr.detectChanges();
        }
      } else {
        console.log('No photos found in instance item, just removing from UI');
        itemProgress.photos.splice(photoIndex, 1);
        this.cdr.detectChanges();
      }
    }
  }

  removeAllPhotos(itemId: number | string): void {
    if (confirm('Are you sure you want to remove all photos for this item?')) {
      console.log('=== removeAllPhotos called ===');
      console.log('itemId:', itemId);
      
      const itemProgress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
      if (itemProgress) {
        console.log('Found itemProgress with', itemProgress.photos.length, 'photos');
        
        // Find the instance item to get the actual photo objects with IDs
        // Extract the base item ID from compound ID for instance item lookup
        const baseItemId = (itemProgress.item as any).baseItemId || itemProgress.item.id;
        const instanceItem = this.instance?.items?.find((instItem: any) => String(instItem.id) === String(baseItemId));
        console.log('Looking for instance item with baseItemId:', baseItemId);
        console.log('Found instanceItem:', instanceItem);
        
        if (instanceItem && (instanceItem as any).photos && Array.isArray((instanceItem as any).photos)) {
          const photosToDelete = (instanceItem as any).photos;
          console.log('Photos to delete:', photosToDelete);
          
          if (photosToDelete.length === 0) {
            console.log('No photos to delete');
            itemProgress.photos = [];
            itemProgress.completed = false;
            this.cdr.detectChanges();
            return;
          }
          
          // Delete each photo from the server
          let deletedCount = 0;
          const totalPhotos = photosToDelete.length;
          
          photosToDelete.forEach((photo: any, index: number) => {
            console.log(`Deleting photo ${index + 1}:`, photo);
            
            if (photo.id) {
              this.photoChecklistService.deletePhoto(photo.id).subscribe({
                next: (response) => {
                  console.log(`Photo ${index + 1} deleted successfully:`, response);
                  deletedCount++;
                  
                  if (deletedCount === totalPhotos) {
                    // All photos deleted, update UI
                    itemProgress.photos = [];
                    itemProgress.completed = false;
                    this.cdr.detectChanges();
                    console.log('All photos deleted, reloading instance data...');
                    this.loadInstance(); // Reload to get fresh data
                  }
                },
                error: (error) => {
                  console.error(`Error deleting photo ${index + 1}:`, error);
                  alert(`Error deleting photo ${index + 1}. Please try again.`);
                }
              });
            } else {
              console.warn(`Photo ${index + 1} has no ID, skipping:`, photo);
              deletedCount++;
              
              if (deletedCount === totalPhotos) {
                // All photos processed, update UI
                itemProgress.photos = [];
                itemProgress.completed = false;
                this.cdr.detectChanges();
                this.loadInstance();
              }
            }
          });
        } else {
          console.log('No photos found in instance item, just clearing UI');
          itemProgress.photos = [];
          itemProgress.completed = false;
          this.cdr.detectChanges();
        }
      } else {
        console.error('Item progress not found for itemId:', itemId);
      }
    }
  }

  previewImage(imageUrl: string): void {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
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
    return this.itemProgress.length;
  }

  goToItem(itemNumber: number): void {
    this.currentStep = itemNumber;
  }

  nextItem(): void {
    if (this.currentStep < this.getTotalItemsCount()) {
      this.currentStep++;
    }
  }

  previousItem(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Missing helper methods for the template
  getCompletedItemsCount(): number {
    return this.itemProgress.filter(p => p.completed).length;
  }

  getCurrentItemIndex(): number {
    return this.currentStep;
  }

  isFirstItem(): boolean {
    return this.currentStep === 1;
  }

  isLastItem(): boolean {
    return this.currentStep === this.getTotalItemsCount();
  }

  getRequiredCompletionStatus(): { completed: number; total: number } {
    const requiredItems = this.itemProgress.filter(p => p.item.is_required);
    const completedRequired = requiredItems.filter(p => p.completed);
    return {
      completed: completedRequired.length,
      total: requiredItems.length
    };
  }

  hasPhotoRequirements(photoRequirements: any): boolean {
    if (!photoRequirements) return false;
    if (typeof photoRequirements === 'string') {
      try {
        const requirements = JSON.parse(photoRequirements);
        return !!(requirements.angle || requirements.distance || requirements.lighting || requirements.focus);
      } catch {
        return false;
      }
    }
    return !!(photoRequirements.angle || photoRequirements.distance || photoRequirements.lighting || photoRequirements.focus);
  }

  getPhotoRequirements(photoRequirements: any): any {
    if (!photoRequirements) return null;
    if (typeof photoRequirements === 'string') {
      try {
        return JSON.parse(photoRequirements);
      } catch {
        return null;
      }
    }
    return photoRequirements;
  }

  // ==============================================
  // Photo Validation Methods
  // ==============================================

  /**
   * Get minimum photos required for an item
   */
  getMinPhotos(item: ChecklistItem): number {
    return item.min_photos || 0;
  }

  /**
   * Get maximum photos allowed for an item
   */
  getMaxPhotos(item: ChecklistItem): number {
    const maxPhotos = item.max_photos || 10; // Default to 10 if not specified
    console.log('getMaxPhotos for item:', item.id, 'max_photos field:', item.max_photos, 'returning:', maxPhotos);
    return maxPhotos;
  }

  /**
   * Check if current photo count is valid for the item
   */
  isPhotoCountValid(itemId: number | string): boolean {
    const progress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    if (!progress) return false;

    const currentCount = progress.photos.length;
    const minPhotos = this.getMinPhotos(progress.item);
    const maxPhotos = this.getMaxPhotos(progress.item);

    return currentCount >= minPhotos && currentCount <= maxPhotos;
  }

  /**
   * Get photo count validation message
   */
  getPhotoCountMessage(itemId: number | string): string {
    const progress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    if (!progress) return '';

    const currentCount = progress.photos.length;
    const minPhotos = this.getMinPhotos(progress.item);
    const maxPhotos = this.getMaxPhotos(progress.item);

    if (currentCount < minPhotos) {
      return `Minimum ${minPhotos} photo${minPhotos > 1 ? 's' : ''} required (${currentCount}/${minPhotos})`;
    }
    
    if (currentCount > maxPhotos) {
      return `Maximum ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} allowed (${currentCount}/${maxPhotos})`;
    }

    if (minPhotos > 0 || maxPhotos < 10) {
      return `${currentCount}/${minPhotos}-${maxPhotos} photos`;
    }

    return `${currentCount} photo${currentCount !== 1 ? 's' : ''}`;
  }

  /**
   * Check if more photos can be added
   */
  canAddMorePhotos(itemId: number | string): boolean {
    const progress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    if (!progress) {
      console.log('canAddMorePhotos: No progress found for itemId:', itemId);
      return false;
    }

    const currentCount = progress.photos.length;
    const maxPhotos = this.getMaxPhotos(progress.item);
    const canAdd = currentCount < maxPhotos;

    console.log('canAddMorePhotos check:', {
      itemId,
      currentCount,
      maxPhotos,
      canAdd,
      item: progress.item
    });

    return canAdd;
  }

  /**
   * Check if photo requirements are met (minimum photos)
   */
  arePhotoRequirementsMet(itemId: number | string): boolean {
    const progress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    if (!progress) return false;

    const currentCount = progress.photos.length;
    const minPhotos = this.getMinPhotos(progress.item);

    return currentCount >= minPhotos;
  }

  /**
   * Get photo status for UI display
   */
  getPhotoStatus(itemId: number | string): 'empty' | 'insufficient' | 'valid' | 'exceeded' {
    const progress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    if (!progress) return 'empty';

    const currentCount = progress.photos.length;
    const minPhotos = this.getMinPhotos(progress.item);
    const maxPhotos = this.getMaxPhotos(progress.item);

    if (currentCount === 0) return 'empty';
    if (currentCount < minPhotos) return 'insufficient';
    if (currentCount > maxPhotos) return 'exceeded';
    return 'valid';
  }

  /**
   * Validate file selection before upload
   */
  validateFileSelection(files: FileList, itemId: number | string): { valid: boolean; error?: string } {
    console.log('=== validateFileSelection ===');
    console.log('Looking for itemId:', itemId, 'Type:', typeof itemId);
    console.log('Available progress items:', this.itemProgress.map(p => ({ id: p.item.id, type: typeof p.item.id })));
    
    const progress = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    if (!progress) {
      console.error('Progress item not found for itemId:', itemId);
      return { valid: false, error: 'Item not found' };
    }

    const currentCount = progress.photos.length;
    const maxPhotos = this.getMaxPhotos(progress.item);
    const newCount = currentCount + files.length;

    console.log('Photo validation:', {
      itemId,
      currentCount,
      maxPhotos,
      newFiles: files.length,
      newCount,
      valid: newCount <= maxPhotos
    });

    if (newCount > maxPhotos) {
      return { 
        valid: false, 
        error: `Cannot add ${files.length} photo(s). Maximum ${maxPhotos} allowed (currently ${currentCount})` 
      };
    }

    return { valid: true };
  }

  /**
   * Convert FileList to array for template iteration
   */
  getFileArray(itemId: number | string): File[] {
    // Convert compound ID to numeric key for selectedFiles dictionary lookup
    const numericKey = typeof itemId === 'string' ? parseInt(itemId.split('_')[1]) || 0 : itemId;
    const files = this.selectedFiles[numericKey];
    return files ? Array.from(files) : [];
  }

  /**
   * Check if an item has a valid ID for uploads
   */
  hasValidItemId(itemId: any): boolean {
    if (itemId === null || itemId === undefined || itemId === '') {
      return false;
    }
    
    // Handle compound IDs (format: "instanceId_baseItemId")
    if (typeof itemId === 'string' && itemId.includes('_')) {
      const parts = itemId.split('_');
      if (parts.length === 2) {
        const instanceId = parseInt(parts[0]);
        const baseItemId = parseInt(parts[1]);
        return !isNaN(instanceId) && !isNaN(baseItemId) && instanceId > 0 && baseItemId > 0;
      }
      return false;
    }
    
    // Handle numeric IDs
    return !isNaN(Number(itemId)) && Number(itemId) > 0;
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
   * Get photo URL with proper base path
   */
  getPhotoUrl(photo: string): string {
    if (photo.startsWith('http')) {
      return photo;
    }
    // Remove leading slash if present to avoid double slashes
    const cleanPath = photo.startsWith('/') ? photo.substring(1) : photo;
    return `https://dashboard.eye-fi.com/${cleanPath}`;
  }

  /**
   * Handle file selection from photo section component
   */
  onFileSelected(event: Event, itemId: number | string): void {
    this.onFileSelectedAndUpload(event, itemId);
  }

  /**
   * Delete photo handler for photo section component
   */
  deletePhoto(photoUrl: string, itemId: number | string): void {
    const progress = this.itemProgress.find(p => 
      String(p.item.id) === String(itemId)
    );
    
    if (progress) {
      const photoIndex = progress.photos.findIndex(photo => photo === photoUrl);
      if (photoIndex !== -1) {
        progress.photos.splice(photoIndex, 1);
        this.updateCompletionStatus(progress);
        this.saveProgressSilently();
      }
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
  }

  /**
   * Handle sample image loading errors
   */
  onSampleImageError(event: any): void {
    console.warn('Failed to load sample image:', event.target.src);
    event.target.style.display = 'none';
  }
}