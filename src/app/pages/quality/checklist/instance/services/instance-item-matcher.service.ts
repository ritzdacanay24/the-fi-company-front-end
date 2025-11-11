import { Injectable } from '@angular/core';

/**
 * Service for matching template items with instance items
 * Uses multiple strategies to find the correct instance item
 */
@Injectable({
  providedIn: 'root'
})
export class InstanceItemMatcherService {

  /**
   * Find instance item using multiple matching strategies
   * Strategy 1: Direct ID match (instItem.id === templateItemId)
   * Strategy 2: template_item_id field match
   * Strategy 3: item_id field match
   * 
   * @param instanceItems - Array of instance items from backend
   * @param templateItemId - Template item ID to match
   * @returns Matched instance item or null
   */
  findInstanceItem(instanceItems: any[] | undefined, templateItemId: number | string): any {
    if (!instanceItems || !Array.isArray(instanceItems) || instanceItems.length === 0) {
      return null;
    }

    // Strategy 1: Match by direct ID (most reliable)
    let instanceItem = instanceItems.find((instItem: any) => 
      String(instItem.id) === String(templateItemId)
    );
    
    if (instanceItem) {
      return instanceItem;
    }

    // Strategy 2: Match by template_item_id field (if backend provides it)
    instanceItem = instanceItems.find((instItem: any) => 
      String(instItem.template_item_id) === String(templateItemId)
    );
    
    if (instanceItem) {
      return instanceItem;
    }

    // Strategy 3: Match by item_id field (if backend provides it)
    instanceItem = instanceItems.find((instItem: any) => 
      String(instItem.item_id) === String(templateItemId)
    );
    
    return instanceItem || null;
  }

  /**
   * Extract photos from instance item
   * @returns Array of photo URLs
   */
  extractPhotos(instanceItem: any): string[] {
    if (!instanceItem || !instanceItem.photos || !Array.isArray(instanceItem.photos)) {
      return [];
    }

    return instanceItem.photos
      .filter((photo: any) => photo.file_url)
      .map((photo: any) => photo.file_url);
  }

  /**
   * Get completion status from instance item
   */
  getCompletionStatus(instanceItem: any): { isCompleted: boolean; completedAt?: Date } {
    if (!instanceItem) {
      return { isCompleted: false };
    }

    const isCompleted = Boolean(instanceItem.is_completed);
    const completedAt = instanceItem.completed_at ? new Date(instanceItem.completed_at) : undefined;

    return { isCompleted, completedAt };
  }

  /**
   * Find photo object by URL across all instance items
   * Useful when instance item matching fails
   */
  findPhotoByUrl(instanceItems: any[] | undefined, photoUrl: string): any {
    if (!instanceItems || !Array.isArray(instanceItems)) {
      return null;
    }

    for (const instItem of instanceItems) {
      if (instItem.photos && Array.isArray(instItem.photos)) {
        const foundPhoto = instItem.photos.find((p: any) => p.file_url === photoUrl);
        if (foundPhoto) {
          return foundPhoto;
        }
      }
    }

    return null;
  }

  /**
   * Get photo object by index from instance item
   */
  getPhotoByIndex(instanceItem: any, photoIndex: number): any {
    if (!instanceItem || !instanceItem.photos || !Array.isArray(instanceItem.photos)) {
      return null;
    }

    if (photoIndex < 0 || photoIndex >= instanceItem.photos.length) {
      return null;
    }

    return instanceItem.photos[photoIndex];
  }
}
