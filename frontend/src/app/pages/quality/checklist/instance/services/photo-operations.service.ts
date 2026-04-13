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
  uploadPhoto(
    instanceId: number,
    itemId: number,
    file: File,
    options?: { captureSource?: 'in-app' | 'system' | 'library'; userId?: number | string }
  ): Observable<any> {
    return this.photoChecklistService.uploadPhoto(instanceId, itemId, file, options);
  }

  /**
   * Delete photo from server and update state
   * @param photoUrl - URL of photo to delete
   * @param itemId - Compound or numeric item ID
   * @param instanceId - Checklist instance ID
   */
  deletePhotoByUrl(
    photoUrl: string, 
    itemId: number | string, 
    instanceId: number
  ): Observable<any> | null {
    const progress = this.stateService.findItemProgress(itemId);
    if (!progress) {
      console.error('Item progress not found for itemId:', itemId);
      return null;
    }

    const photoIndex = progress.photos.findIndex(p => p === photoUrl);
    const videoIndex = (progress.videos || []).findIndex(v => v === photoUrl);
    const isVideo = videoIndex !== -1 && photoIndex === -1;
    if (photoIndex === -1 && videoIndex === -1) {
      console.warn('Media not found in progress state, will attempt server delete by URL:', photoUrl);
    }

    if (!instanceId || instanceId <= 0) {
      console.error('Invalid instanceId for deletePhotoByUrl:', instanceId);
      return null;
    }

    // Extract base DB item ID and delete by locator to avoid stale index/ID mapping bugs.
    const baseItemId = this.idExtractor.extractBaseItemId(
      progress.item.id, 
      (progress.item as any).baseItemId
    );

    // Delete from server using stable locator fields.
    return this.photoChecklistService.deleteMediaByLocator(instanceId, baseItemId, photoUrl).pipe(
      tap(() => {
        // Remove from state after successful deletion
        if (isVideo) {
          this.stateService.removeVideoByUrl(itemId, photoUrl);
        } else {
          this.stateService.removePhotoByUrl(itemId, photoUrl);
        }
      })
    );
  }

  /**
   * Delete photo by index
   */
  deletePhotoByIndex(
    itemId: number | string,
    photoIndex: number,
    instanceId: number
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
    return this.deletePhotoByUrl(photoUrl, itemId, instanceId);
  }

  /**
   * Delete all photos for an item
   */
  deleteAllPhotos(
    itemId: number | string,
    instanceId: number
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

    if (!instanceId || instanceId <= 0) {
      console.error('Invalid instanceId for deleteAllPhotos:', instanceId);
      return null;
    }

    // Create array of delete observables using stable locator fields.
    const deleteObservables: Observable<any>[] = [];
    const baseItemId = this.idExtractor.extractBaseItemId(
      progress.item.id,
      (progress.item as any).baseItemId
    );

    progress.photos.forEach((photoUrl: string) => {
      deleteObservables.push(
        this.photoChecklistService.deleteMediaByLocator(instanceId, baseItemId, photoUrl)
      );
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
