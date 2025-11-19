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
  notes: string;
  completedAt?: Date;
}

interface CompletionData {
  itemId: string | number;
  completed: boolean;
  completedAt?: string;
  notes?: string;
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
  toggleItemCompletion(itemId: number | string): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const newCompleted = !item.completed;
    this.updateItemProgress(itemId, {
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : undefined
    });
  }

  /**
   * Add photo to item
   */
  addPhoto(itemId: number | string, photoUrl: string): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const newPhotos = [...item.photos, photoUrl];
    
    // Check if item should be marked as completed
    // For photo items, if min_photos requirement is met
    const minPhotos = item.item.photo_requirements?.min_photos || 1;
    const shouldComplete = newPhotos.length >= minPhotos;

    this.updateItemProgress(itemId, {
      photos: newPhotos,
      completed: shouldComplete,
      completedAt: shouldComplete && !item.completedAt ? new Date() : item.completedAt
    });
  }

  /**
   * Remove photo from item by index
   */
  removePhoto(itemId: number | string, photoIndex: number): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const photos = [...item.photos];
    photos.splice(photoIndex, 1);
    
    // Check if item should still be marked as completed
    const minPhotos = item.item.photo_requirements?.min_photos || 1;
    const shouldComplete = photos.length >= minPhotos;
    
    this.updateItemProgress(itemId, { 
      photos,
      completed: shouldComplete,
      completedAt: shouldComplete ? item.completedAt : undefined
    });
  }

  /**
   * Remove photo from item by URL
   */
  removePhotoByUrl(itemId: number | string, photoUrl: string): void {
    const item = this.findItemProgress(itemId);
    if (!item) return;

    const photos = item.photos.filter(p => p !== photoUrl);
    
    // Check if item should still be marked as completed
    const minPhotos = item.item.photo_requirements?.min_photos || 1;
    const shouldComplete = photos.length >= minPhotos;
    
    this.updateItemProgress(itemId, { 
      photos,
      completed: shouldComplete,
      completedAt: shouldComplete ? item.completedAt : undefined
    });
  }

  /**
   * Remove all photos from item
   */
  removeAllPhotos(itemId: number | string): void {
    this.updateItemProgress(itemId, { 
      photos: [],
      completed: false,
      completedAt: undefined
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
   * Get completion percentage based on PARENT items only
   * Sub-items are considered part of their parent's completion
   */
  getCompletionPercentage(): number {
    const progress = this.itemProgressSubject.value;
    if (progress.length === 0) return 0;
    
    // Only count parent items (level 0 or undefined)
    const parentItems = progress.filter(p => p.item.level === 0 || !p.item.level);
    if (parentItems.length === 0) return 0;
    
    const completedParents = parentItems.filter(p => p.completed).length;
    return Math.round((completedParents / parentItems.length) * 100);
  }

  /**
   * Get required items completion status
   */
  getRequiredCompletionStatus(): { completed: number; total: number } {
    const progress = this.itemProgressSubject.value;
    const requiredItems = progress.filter(p => p.item.is_required);
    const completedRequired = requiredItems.filter(p => p.completed);
    
    return {
      completed: completedRequired.length,
      total: requiredItems.length
    };
  }

  /**
   * Get completed items count (PARENT items only)
   * Matches the numerator used in getCompletionPercentage()
   */
  getCompletedItemsCount(): number {
    const parentItems = this.itemProgressSubject.value.filter(p => p.item.level === 0 || !p.item.level);
    return parentItems.filter(p => p.completed).length;
  }

  /**
   * Get total items count (PARENT items only)
   * This should match the denominator used in getCompletionPercentage()
   */
  getTotalItemsCount(): number {
    return this.itemProgressSubject.value.filter(p => p.item.level === 0 || !p.item.level).length;
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
      notes: p.notes || ''
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
      notes: p.notes || ''
    }));
  }
}
