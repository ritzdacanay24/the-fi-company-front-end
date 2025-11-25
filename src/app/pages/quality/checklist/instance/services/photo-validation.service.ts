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
   * NOW RESPECTS submission_type to ensure correct media is uploaded
   */
  canCompleteItem(currentPhotoCount: number, item: ChecklistItem, currentVideoCount: number = 0): PhotoValidationResult {
    const submissionType = item.submission_type || 'photo'; // Default to photo for backward compatibility
    const minPhotos = this.getMinPhotos(item);
    
    // Validation based on submission_type
    switch (submissionType) {
      case 'photo':
        // PHOTO ONLY: Must have photos if min_photos > 0
        if (minPhotos > 0 && currentPhotoCount < minPhotos) {
          return {
            valid: false,
            error: `Cannot mark as complete. This item requires at least ${minPhotos} photo${minPhotos > 1 ? 's' : ''}.`
          };
        }
        break;
        
      case 'video':
        // VIDEO ONLY: Must have at least one video
        if (currentVideoCount === 0) {
          return {
            valid: false,
            error: `Cannot mark as complete. This item requires a video submission.`
          };
        }
        break;
        
      case 'either':
        // EITHER: Must have at least one photo OR one video
        if (currentPhotoCount === 0 && currentVideoCount === 0) {
          return {
            valid: false,
            error: `Cannot mark as complete. This item requires either a photo or video submission.`
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Check if submission requirements are met based on submission_type
   */
  areSubmissionRequirementsMet(photoCount: number, videoCount: number, item: ChecklistItem): boolean {
    const submissionType = item.submission_type || 'photo';
    const minPhotos = this.getMinPhotos(item);
    
    switch (submissionType) {
      case 'photo':
        return photoCount >= minPhotos;
      case 'video':
        return videoCount > 0;
      case 'either':
        return photoCount > 0 || videoCount > 0;
      default:
        return photoCount >= minPhotos; // Fallback
    }
  }
}
