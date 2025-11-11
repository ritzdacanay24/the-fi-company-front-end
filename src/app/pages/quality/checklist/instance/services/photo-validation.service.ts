import { Injectable } from '@angular/core';
import { ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

export type PhotoStatus = 'empty' | 'insufficient' | 'valid' | 'exceeded';

/**
 * Service for validating photo requirements and counts
 */
@Injectable({
  providedIn: 'root'
})
export class PhotoValidationService {

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
    return item.max_photos || 10; // Default to 10 if not specified
  }

  /**
   * Check if current photo count is valid for the item
   */
  isPhotoCountValid(currentCount: number, item: ChecklistItem): boolean {
    const minPhotos = this.getMinPhotos(item);
    const maxPhotos = this.getMaxPhotos(item);
    return currentCount >= minPhotos && currentCount <= maxPhotos;
  }

  /**
   * Check if photo requirements are met (minimum photos)
   */
  arePhotoRequirementsMet(currentCount: number, item: ChecklistItem): boolean {
    const minPhotos = this.getMinPhotos(item);
    return currentCount >= minPhotos;
  }

  /**
   * Check if more photos can be added
   */
  canAddMorePhotos(currentCount: number, item: ChecklistItem): boolean {
    const maxPhotos = this.getMaxPhotos(item);
    return currentCount < maxPhotos;
  }

  /**
   * Get photo count validation message
   */
  getPhotoCountMessage(currentCount: number, item: ChecklistItem): string {
    const minPhotos = this.getMinPhotos(item);
    const maxPhotos = this.getMaxPhotos(item);

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
   * Get photo status for UI display
   */
  getPhotoStatus(currentCount: number, item: ChecklistItem): PhotoStatus {
    const minPhotos = this.getMinPhotos(item);
    const maxPhotos = this.getMaxPhotos(item);

    if (currentCount === 0) return 'empty';
    if (currentCount < minPhotos) return 'insufficient';
    if (currentCount > maxPhotos) return 'exceeded';
    return 'valid';
  }

  /**
   * Validate file selection before upload
   */
  validateFileSelection(
    files: FileList, 
    currentPhotoCount: number, 
    item: ChecklistItem
  ): PhotoValidationResult {
    const maxPhotos = this.getMaxPhotos(item);
    const newCount = currentPhotoCount + files.length;

    if (newCount > maxPhotos) {
      return { 
        valid: false, 
        error: `Cannot add ${files.length} photo(s). Maximum ${maxPhotos} allowed (currently ${currentPhotoCount})` 
      };
    }

    return { valid: true };
  }

  /**
   * Check if item has photo requirements defined
   */
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
    
    return !!(photoRequirements.angle || photoRequirements.distance || 
              photoRequirements.lighting || photoRequirements.focus);
  }

  /**
   * Parse photo requirements from string or object
   */
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

  /**
   * Validate if item can be marked as complete
   */
  canCompleteItem(currentPhotoCount: number, item: ChecklistItem): PhotoValidationResult {
    const minPhotos = this.getMinPhotos(item);
    
    if (minPhotos > 0 && currentPhotoCount < minPhotos) {
      return {
        valid: false,
        error: `Cannot mark as complete. This item requires at least ${minPhotos} photo${minPhotos > 1 ? 's' : ''}.`
      };
    }

    return { valid: true };
  }
}
