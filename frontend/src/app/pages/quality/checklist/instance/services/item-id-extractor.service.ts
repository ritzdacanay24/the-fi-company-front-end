import { Injectable } from '@angular/core';

/**
 * Service for handling compound item IDs and extraction logic
 * Format: "instanceId_baseItemId" (e.g., "15_950")
 */
@Injectable({
  providedIn: 'root'
})
export class ItemIdExtractorService {

  /**
   * Extract base item ID from compound ID
   * @param itemId - Can be compound string ("15_950") or numeric ID
   * @param fallbackBaseItemId - Optional stored baseItemId property
   */
  extractBaseItemId(itemId: number | string, fallbackBaseItemId?: number): number {
    if (fallbackBaseItemId) {
      return fallbackBaseItemId;
    }
    
    if (typeof itemId === 'string' && itemId.includes('_')) {
      const parts = itemId.split('_');
      return parseInt(parts[1], 10);
    }
    
    return Number(itemId);
  }

  /**
   * Extract instance ID from compound ID
   */
  extractInstanceId(itemId: string): number | null {
    if (typeof itemId === 'string' && itemId.includes('_')) {
      const parts = itemId.split('_');
      return parseInt(parts[0], 10);
    }
    return null;
  }

  /**
   * Create compound ID from instance and base item IDs
   */
  createCompoundId(instanceId: number, baseItemId: number): string {
    return `${instanceId}_${baseItemId}`;
  }

  /**
   * Validate if item ID is valid for operations
   */
  isValidItemId(itemId: any): boolean {
    if (itemId === null || itemId === undefined || itemId === '') {
      return false;
    }
    
    // Handle compound IDs (format: "instanceId_baseItemId")
    if (typeof itemId === 'string' && itemId.includes('_')) {
      const parts = itemId.split('_');
      if (parts.length === 2) {
        const instanceId = parseInt(parts[0], 10);
        const baseItemId = parseInt(parts[1], 10);
        return !isNaN(instanceId) && !isNaN(baseItemId) && instanceId > 0 && baseItemId > 0;
      }
      return false;
    }
    
    // Handle numeric IDs
    return !isNaN(Number(itemId)) && Number(itemId) > 0;
  }

  /**
   * Convert compound ID to numeric key for dictionary lookups
   */
  toNumericKey(itemId: number | string): number {
    if (typeof itemId === 'string' && itemId.includes('_')) {
      return parseInt(itemId.split('_')[1], 10) || 0;
    }
    return typeof itemId === 'number' ? itemId : parseInt(String(itemId), 10);
  }

  /**
   * Validate instance ID
   */
  isValidInstanceId(instanceId: any): boolean {
    return instanceId !== null && 
           instanceId !== undefined && 
           !isNaN(Number(instanceId)) && 
           Number(instanceId) > 0;
  }
}
