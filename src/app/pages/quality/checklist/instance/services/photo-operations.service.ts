import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PhotoChecklistConfigService } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { ChecklistStateService } from './checklist-state.service';
import { ItemIdExtractorService } from './item-id-extractor.service';
import { InstanceItemMatcherService } from './instance-item-matcher.service';

/**
 * Service for handling photo CRUD operations
 * Consolidates duplicated photo deletion logic
 */
@Injectable({
  providedIn: 'root'
})
export class PhotoOperationsService {

  constructor(
    private photoChecklistService: PhotoChecklistConfigService,
    private stateService: ChecklistStateService,
    private idExtractor: ItemIdExtractorService,
    private instanceMatcher: InstanceItemMatcherService
  ) {}

  /**
   * Upload photo to server
   */
  uploadPhoto(instanceId: number, itemId: number, file: File): Observable<any> {
    return this.photoChecklistService.uploadPhoto(instanceId, itemId, file);
  }

  /**
   * Delete photo from server and update state
   * @param photoUrl - URL of photo to delete
   * @param itemId - Compound or numeric item ID
   * @param instanceItems - Instance items array from backend
   */
  deletePhotoByUrl(
    photoUrl: string, 
    itemId: number | string, 
    instanceItems: any[]
  ): Observable<any> | null {
    const progress = this.stateService.findItemProgress(itemId);
    if (!progress) {
      console.error('Item progress not found for itemId:', itemId);
      return null;
    }

    const photoIndex = progress.photos.findIndex(p => p === photoUrl);
    if (photoIndex === -1) {
      console.error('Photo not found in progress.photos:', photoUrl);
      return null;
    }

    // Extract base item ID for instance lookup
    const baseItemId = this.idExtractor.extractBaseItemId(
      progress.item.id, 
      (progress.item as any).baseItemId
    );

    // Find instance item using matcher service
    const instanceItem = this.instanceMatcher.findInstanceItem(instanceItems, baseItemId);
    
    // Get photo object
    let photoToDelete = this.instanceMatcher.getPhotoByIndex(instanceItem, photoIndex);
    
    // Fallback: search by URL across all instance items
    if (!photoToDelete || !photoToDelete.id) {
      photoToDelete = this.instanceMatcher.findPhotoByUrl(instanceItems, photoUrl);
    }

    if (!photoToDelete || !photoToDelete.id) {
      console.warn('Photo has no ID, removing from UI only');
      this.stateService.removePhotoByUrl(itemId, photoUrl);
      return null;
    }

    // Delete from server
    return this.photoChecklistService.deletePhoto(photoToDelete.id).pipe(
      tap(() => {
        // Remove from state after successful deletion
        this.stateService.removePhotoByUrl(itemId, photoUrl);
      })
    );
  }

  /**
   * Delete photo by index
   */
  deletePhotoByIndex(
    itemId: number | string,
    photoIndex: number,
    instanceItems: any[]
  ): Observable<any> | null {
    const progress = this.stateService.findItemProgress(itemId);
    if (!progress) {
      console.error('Item progress not found for itemId:', itemId);
      return null;
    }

    if (photoIndex < 0 || photoIndex >= progress.photos.length) {
      console.error('Invalid photo index:', photoIndex);
      return null;
    }

    const photoUrl = progress.photos[photoIndex];
    return this.deletePhotoByUrl(photoUrl, itemId, instanceItems);
  }

  /**
   * Delete all photos for an item
   */
  deleteAllPhotos(
    itemId: number | string,
    instanceItems: any[]
  ): Observable<any[]> | null {
    const progress = this.stateService.findItemProgress(itemId);
    if (!progress) {
      console.error('Item progress not found for itemId:', itemId);
      return null;
    }

    if (progress.photos.length === 0) {
      console.log('No photos to delete');
      this.stateService.removeAllPhotos(itemId);
      return null;
    }

    // Extract base item ID
    const baseItemId = this.idExtractor.extractBaseItemId(
      progress.item.id,
      (progress.item as any).baseItemId
    );

    // Find instance item
    const instanceItem = this.instanceMatcher.findInstanceItem(instanceItems, baseItemId);
    
    if (!instanceItem || !instanceItem.photos || instanceItem.photos.length === 0) {
      console.log('No photos found in instance item, clearing UI only');
      this.stateService.removeAllPhotos(itemId);
      return null;
    }

    // Create array of delete observables
    const deleteObservables: Observable<any>[] = [];
    
    instanceItem.photos.forEach((photo: any) => {
      if (photo.id) {
        deleteObservables.push(
          this.photoChecklistService.deletePhoto(photo.id)
        );
      }
    });

    if (deleteObservables.length === 0) {
      this.stateService.removeAllPhotos(itemId);
      return null;
    }

    // Return combined observable (caller should use forkJoin or similar)
    return new Observable(observer => {
      let completed = 0;
      const total = deleteObservables.length;
      const results: any[] = [];

      deleteObservables.forEach((obs, index) => {
        obs.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            
            if (completed === total) {
              this.stateService.removeAllPhotos(itemId);
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            console.error(`Error deleting photo ${index + 1}:`, error);
            completed++;
            
            if (completed === total) {
              observer.error(error);
            }
          }
        });
      });
    });
  }

  /**
   * Get photo URL with proper base path
   */
  getPhotoUrl(photo: string | any): string {
    let photoUrl: string;
    
    if (typeof photo === 'string') {
      photoUrl = photo;
    } else if (photo && typeof photo === 'object' && photo.file_url) {
      photoUrl = photo.file_url;
    } else {
      console.warn('Invalid photo format:', photo);
      return '';
    }
    
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    
    const cleanPath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
    return `https://dashboard.eye-fi.com/${cleanPath}`;
  }
}
