import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChecklistItem, ChecklistInstance, ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

export interface ChecklistItemProgress {
  item: ChecklistItem & { 
    id: number | string;
    original_position?: number; 
    baseItemId?: number;
  };
  completed: boolean;
  photos: string[];
  photoMeta?: Record<string, { source?: 'in-app' | 'system' | 'library' }>; // per-photo metadata by URL
  videos?: string[]; // NEW: Array of uploaded video URLs
  videoMeta?: Record<string, { source?: 'in-app' | 'system' | 'library' }>; // per-video metadata by URL
  notes: string;
  completedAt?: Date;
  completedByUserId?: number; // Track who completed this item
  completedByName?: string; // Display name of who completed it

  lastModifiedAt?: Date; // Track last modification time
  lastModifiedByUserId?: number; // Track who last modified this item
  lastModifiedByName?: string; // Display name of who last modified it
}

interface CompletionData {
  itemId: string | number;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  completedByUserId?: number;
  completedByName?: string;
  photoMeta?: Record<string, { source?: 'in-app' | 'system' | 'library' }>;
  videoMeta?: Record<string, { source?: 'in-app' | 'system' | 'library' }>;
  lastModifiedAt?: string;
  lastModifiedByUserId?: number;
  lastModifiedByName?: string;
}

/**
 * Service for managing checklist state, progress, and localStorage persistence
 */
@Injectable({
  providedIn: 'root'
})
export class ChecklistStateService {
  private itemProgressSubject = new BehaviorSubject<ChecklistItemProgress[]>([]);
  public itemProgress$ = this.itemProgressSubject.asObservable();

  private currentInstanceId: number | null = null;

  constructor() {}

  /**
   * Get current item progress array
   */
  getItemProgress(): ChecklistItemProgress[] {
    return this.itemProgressSubject.value;
  }

  /**
   * Update item progress array
   */
  setItemProgress(progress: ChecklistItemProgress[]): void {
    this.itemProgressSubject.next(progress);
  }

  /**
   * Find item progress by item ID
   */
  findItemProgress(itemId: number | string): ChecklistItemProgress | undefined {
    return this.itemProgressSubject.value.find(p => String(p.item.id) === String(itemId));
  }

  /**
   * Update a specific item's progress
   */
  updateItemProgress(itemId: number | string, updates: Partial<ChecklistItemProgress>): void {
    const progress = this.itemProgressSubject.value;
    const index = progress.findIndex(p => String(p.item.id) === String(itemId));
    
    if (index !== -1) {
      progress[index] = { ...progress[index], ...updates };
      this.itemProgressSubject.next([...progress]);
      this.saveToLocalStorage();
    }
  }

  /**
   * Toggle item completion status
   */
  toggleItemCompletion(itemId: number | string, userId?: number, userName?: string): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const newCompleted = !item.completed;
    this.updateItemProgress(itemId, {
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : undefined,
      completedByUserId: newCompleted ? (userId ?? item.completedByUserId) : undefined,
      completedByName:   newCompleted ? (userName ?? item.completedByName) : undefined,
      lastModifiedAt: new Date(),
      lastModifiedByUserId: userId,
      lastModifiedByName: userName
    });
  }

  /**
   * Add photo to item
   */
  addPhoto(
    itemId: number | string,
    photoUrl: string,
    userId?: number,
    userName?: string,
    captureSource?: 'in-app' | 'system' | 'library'
  ): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const newPhotos = [...item.photos, photoUrl];
    
    // Check if item should be marked as completed
    // For photo items, if min_photos requirement is met
    const minPhotos = item.item.photo_requirements?.min_photos || 1;
    const shouldComplete = newPhotos.length >= minPhotos;

    const photoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> = { ...(item.photoMeta || {}) };
    if (captureSource) {
      photoMeta[photoUrl] = { ...(photoMeta[photoUrl] || {}), source: captureSource };
    }

    this.updateItemProgress(itemId, {
      photos: newPhotos,
      photoMeta,
      completed: shouldComplete,
      completedAt: shouldComplete && !item.completedAt ? new Date() : item.completedAt,
      completedByUserId: shouldComplete && !item.completedByUserId ? userId : item.completedByUserId,
      completedByName: shouldComplete && !item.completedByName ? userName : item.completedByName,
      lastModifiedAt: new Date(),
      lastModifiedByUserId: userId,
      lastModifiedByName: userName
    });
  }

  /**
   * Add/replace video for an item
   * Note: UI currently supports a single video per item.
   */
  addVideo(
    itemId: number | string,
    videoUrl: string,
    userId?: number,
    userName?: string,
    captureSource?: 'in-app' | 'system' | 'library'
  ): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const submissionType = (item.item.submission_type || 'photo') as any;
    const nextVideos = [videoUrl];
    const videoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> = {};
    if (captureSource) {
      videoMeta[videoUrl] = { source: captureSource };
    }

    // For video/audio/either submissions, uploaded media is sufficient to complete.
    const shouldComplete = submissionType === 'video' || submissionType === 'audio' || submissionType === 'either';

    this.updateItemProgress(itemId, {
      videos: nextVideos,
      videoMeta,
      completed: shouldComplete ? true : item.completed,
      completedAt: shouldComplete && !item.completedAt ? new Date() : item.completedAt,
      completedByUserId: shouldComplete && !item.completedByUserId ? userId : item.completedByUserId,
      completedByName: shouldComplete && !item.completedByName ? userName : item.completedByName,
      lastModifiedAt: new Date(),
      lastModifiedByUserId: userId,
      lastModifiedByName: userName
    });
  }

  removeVideoByUrl(itemId: number | string, videoUrl: string): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const videos = (item.videos || []).filter(v => v !== videoUrl);
    const videoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> = { ...(item.videoMeta || {}) };
    if (videoMeta[videoUrl]) {
      delete videoMeta[videoUrl];
    }
    const submissionType = (item.item.submission_type || 'photo') as any;

    // If this is a video-only item, removing the video makes it incomplete.
    const shouldBeComplete = submissionType === 'either'
      ? (item.photos?.length || 0) > 0 || videos.length > 0
      : (submissionType === 'video' || submissionType === 'audio')
        ? videos.length > 0
        : item.completed;

    this.updateItemProgress(itemId, {
      videos,
      videoMeta,
      completed: shouldBeComplete,
      completedAt:        shouldBeComplete ? item.completedAt        : undefined,
      completedByUserId:  shouldBeComplete ? item.completedByUserId  : undefined,
      completedByName:    shouldBeComplete ? item.completedByName    : undefined,
      lastModifiedAt: new Date()
    });
  }

  /**
   * Remove photo from item by index
   */
  removePhoto(itemId: number | string, photoIndex: number): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const photos = [...item.photos];
    const removedUrl = photos[photoIndex];
    photos.splice(photoIndex, 1);
    
    // Check if item should still be marked as completed
    const minPhotos = item.item.photo_requirements?.min_photos || 1;
    const shouldComplete = photos.length >= minPhotos;
    
    const photoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> = { ...(item.photoMeta || {}) };
    if (removedUrl && photoMeta[removedUrl]) {
      delete photoMeta[removedUrl];
    }

    this.updateItemProgress(itemId, { 
      photos,
      photoMeta,
      completed: shouldComplete,
      completedAt:       shouldComplete ? item.completedAt       : undefined,
      completedByUserId: shouldComplete ? item.completedByUserId : undefined,
      completedByName:   shouldComplete ? item.completedByName   : undefined,
      lastModifiedAt: new Date()
    });
  }

  /**
   * Remove photo from item by URL
   */
  removePhotoByUrl(itemId: number | string, photoUrl: string): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const photos = item.photos.filter(p => p !== photoUrl);

    const photoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> = { ...(item.photoMeta || {}) };
    if (photoMeta[photoUrl]) {
      delete photoMeta[photoUrl];
    }
    
    // Check if item should still be marked as completed
    const minPhotos = item.item.photo_requirements?.min_photos || 1;
    const shouldComplete = photos.length >= minPhotos;
    
    this.updateItemProgress(itemId, { 
      photos,
      photoMeta,
      completed: shouldComplete,
      completedAt:       shouldComplete ? item.completedAt       : undefined,
      completedByUserId: shouldComplete ? item.completedByUserId : undefined,
      completedByName:   shouldComplete ? item.completedByName   : undefined,
      lastModifiedAt: new Date()
    });
  }

  /**
   * Remove all photos from item
   */
  removeAllPhotos(itemId: number | string): void {
    this.updateItemProgress(itemId, { 
      photos: [],
      photoMeta: {},
      completed: false,
      completedAt: undefined,
      completedByUserId: undefined,
      completedByName: undefined,
      lastModifiedAt: new Date()
    });
  }

  /**
   * Update item notes
   */
  updateNotes(itemId: number | string, notes: string): void {
    this.updateItemProgress(itemId, { notes });
    this.saveToLocalStorage();
  }

  /**
   * Get completion percentage based on required items only
   * Items without is_required are treated as required by default
   */
  getCompletionPercentage(): number {
    const progress = this.itemProgressSubject.value;
    if (progress.length === 0) return 0;

    const requiredItems = progress.filter(p => p.item.is_required !== false);
    const total = requiredItems.length;
    if (total === 0) return 0;

    const completed = requiredItems.filter(p => p.completed).length;
    return Math.round((completed / total) * 100);
  }

  /**
   * Get required items completion status
   */
  getRequiredCompletionStatus(): { completed: number; total: number } {
    const progress = this.itemProgressSubject.value;
    const requiredItems = progress.filter(p => p.item.is_required !== false);
    const completedRequired = requiredItems.filter(p => p.completed);
    
    return {
      completed: completedRequired.length,
      total: requiredItems.length
    };
  }

  /**
   * Get completed required items count
   * Matches the numerator used in getCompletionPercentage()
   */
  getCompletedItemsCount(): number {
    const requiredItems = this.itemProgressSubject.value.filter(p => p.item.is_required !== false);
    return requiredItems.filter(p => p.completed).length;
  }

  /**
   * Get total required items count
   * This should match the denominator used in getCompletionPercentage()
   */
  getTotalItemsCount(): number {
    return this.itemProgressSubject.value.filter(p => p.item.is_required !== false).length;
  }

  /**
   * Get total parent items count only (excluding sub-items)
   * Used for navigation purposes
   */
  getTotalParentItemsCount(): number {
    return this.itemProgressSubject.value.filter(p => p.item.level === 0 || !p.item.level).length;
  }

  /**
   * Check if all required items are completed
   */
  areAllRequiredItemsCompleted(): boolean {
    const status = this.getRequiredCompletionStatus();
    return status.completed === status.total;
  }

  /**
   * Set current instance ID for localStorage keys
   */
  setInstanceId(instanceId: number): void {
    this.currentInstanceId = instanceId;
  }

  /**
   * Save completion data to localStorage
   */
  saveToLocalStorage(): void {
    if (!this.currentInstanceId) return;

    const completionData: CompletionData[] = this.itemProgressSubject.value.map(p => ({
      itemId: p.item.id,
      completed: p.completed,
      completedAt: p.completedAt?.toISOString(),
      notes: p.notes || '',
      completedByUserId: p.completedByUserId,
      completedByName: p.completedByName,
      photoMeta: p.photoMeta,
      videoMeta: p.videoMeta,
      lastModifiedAt: p.lastModifiedAt?.toISOString(),
      lastModifiedByUserId: p.lastModifiedByUserId,
      lastModifiedByName: p.lastModifiedByName
    }));

    const key = `checklist_${this.currentInstanceId}_completion`;
    localStorage.setItem(key, JSON.stringify(completionData));
  }

  /**
   * Load completion data from localStorage
   */
  loadFromLocalStorage(): Map<string, CompletionData> {
    if (!this.currentInstanceId) return new Map();

    const key = `checklist_${this.currentInstanceId}_completion`;
    const savedData = localStorage.getItem(key);
    
    if (!savedData) return new Map();

    try {
      const parsed: CompletionData[] = JSON.parse(savedData);
      const map = new Map<string, CompletionData>();
      
      parsed.forEach(item => {
        map.set(String(item.itemId), item);
      });
      
      return map;
    } catch (e) {
      console.warn('Failed to parse completion data from localStorage:', e);
      return new Map();
    }
  }

  /**
   * Clear localStorage for current instance
   */
  clearLocalStorage(): void {
    if (!this.currentInstanceId) return;
    
    const key = `checklist_${this.currentInstanceId}_completion`;
    localStorage.removeItem(key);
  }

  /**
   * Reset state
   */
  reset(): void {
    this.itemProgressSubject.next([]);
    this.currentInstanceId = null;
  }

  /**
   * Get completion data for API submission
   */
  getCompletionDataForApi(): CompletionData[] {
    return this.itemProgressSubject.value.map(p => ({
      itemId: p.item.id,
      completed: p.completed,
      completedAt: p.completedAt?.toISOString(),
      notes: p.notes || '',
      completedByUserId: p.completedByUserId,
      completedByName: p.completedByName,
      photoMeta: p.photoMeta,
      videoMeta: p.videoMeta,
      lastModifiedAt: p.lastModifiedAt?.toISOString(),
      lastModifiedByUserId: p.lastModifiedByUserId,
      lastModifiedByName: p.lastModifiedByName
    }));
  }
}
