import { Injectable } from '@angular/core';
import { ChecklistConfig, ChecklistItem } from './inspection-checklist.component';

@Injectable({
  providedIn: 'root'
})
export class InspectionChecklistService {

  /**
   * Create a photo inspection checklist for quality control
   */
  createPhotoInspectionChecklist(): ChecklistConfig {
    return {
      title: 'Product Photo Inspection',
      description: 'Capture required photos for quality verification',
      type: 'photo-inspection',
      items: [
        {
          id: 'front-view',
          title: 'Front View Photo',
          description: 'Take a clear photo of the product from the front',
          instructions: [
            'Position product on clean, neutral background',
            'Ensure good lighting with no shadows',
            'Capture entire product in frame',
            'Hold camera steady and focus before shooting'
          ],
          requiresPhoto: true,
          photoCount: 1,
          completed: false
        },
        {
          id: 'serial-number',
          title: 'Serial Number/Label Photo',
          description: 'Capture clear image of serial number or product label',
          instructions: [
            'Get close-up shot of serial number or label',
            'Ensure text is readable and in focus',
            'Avoid glare or reflections on label',
            'Include surrounding area for context'
          ],
          requiresPhoto: true,
          photoCount: 1,
          completed: false
        },
        {
          id: 'defect-areas',
          title: 'Defect Documentation',
          description: 'Photograph any visible defects or quality issues',
          instructions: [
            'Take close-up photos of each defect',
            'Include wider shot showing defect location',
            'Use good lighting to show details clearly',
            'Take multiple angles if needed'
          ],
          requiresPhoto: true,
          photoCount: 3,
          completed: false
        },
        {
          id: 'packaging',
          title: 'Packaging Condition',
          description: 'Document packaging condition and integrity',
          instructions: [
            'Photograph packaging from multiple angles',
            'Show any damage or wear',
            'Include shipping labels if applicable',
            'Document packaging materials used'
          ],
          requiresPhoto: true,
          photoCount: 2,
          completed: false
        }
      ]
    };
  }

  /**
   * Create a shipping checklist
   */
  createShippingChecklist(): ChecklistConfig {
    return {
      title: 'Shipping Inspection Checklist',
      description: 'Verify all shipping requirements before dispatch',
      type: 'shipping',
      items: [
        {
          id: 'address-verification',
          title: 'Verify Shipping Address',
          description: 'Confirm shipping address matches order',
          instructions: [
            'Compare shipping label with order details',
            'Verify recipient name spelling',
            'Check address format and postal code',
            'Confirm special delivery instructions'
          ],
          completed: false
        },
        {
          id: 'package-weight',
          title: 'Verify Package Weight',
          description: 'Confirm package weight matches shipping label',
          instructions: [
            'Weigh package on certified scale',
            'Compare with shipping label weight',
            'Document any discrepancies',
            'Adjust shipping if necessary'
          ],
          completed: false
        },
        {
          id: 'packaging-secure',
          title: 'Secure Packaging',
          description: 'Ensure package is properly sealed and protected',
          instructions: [
            'Check all seams are properly taped',
            'Verify fragile items have adequate cushioning',
            'Ensure no items can shift during transport',
            'Apply "Fragile" labels if needed'
          ],
          completed: false
        },
        {
          id: 'documentation',
          title: 'Include Required Documentation',
          description: 'Add all necessary paperwork and labels',
          instructions: [
            'Include packing slip inside package',
            'Attach shipping label securely',
            'Add return address label',
            'Include any customs forms if international'
          ],
          requiresPhoto: true,
          photoCount: 1,
          completed: false
        },
        {
          id: 'final-inspection',
          title: 'Final Package Inspection',
          description: 'Complete visual inspection before shipping',
          instructions: [
            'Check package for damage or defects',
            'Verify all labels are legible',
            'Confirm package meets carrier requirements',
            'Take photo for shipping records'
          ],
          requiresPhoto: true,
          photoCount: 1,
          completed: false
        }
      ]
    };
  }

  /**
   * Create a quality control checklist
   */
  createQualityControlChecklist(): ChecklistConfig {
    return {
      title: 'Quality Control Inspection',
      description: 'Comprehensive quality verification checklist',
      type: 'quality',
      items: [
        {
          id: 'visual-inspection',
          title: 'Visual Inspection',
          description: 'Check product for visual defects or irregularities',
          instructions: [
            'Inspect all surfaces for scratches, dents, or discoloration',
            'Check for proper finish and coating',
            'Verify color matches specifications',
            'Look for any manufacturing defects'
          ],
          completed: false
        },
        {
          id: 'dimensional-check',
          title: 'Dimensional Verification',
          description: 'Verify product dimensions meet specifications',
          instructions: [
            'Measure critical dimensions with calibrated tools',
            'Compare measurements to engineering drawings',
            'Document any deviations from specifications',
            'Check tolerances are within acceptable range'
          ],
          completed: false
        },
        {
          id: 'functional-test',
          title: 'Functional Testing',
          description: 'Test product functionality and performance',
          instructions: [
            'Perform all standard operational tests',
            'Check electrical connections if applicable',
            'Test moving parts and mechanisms',
            'Verify product meets performance criteria'
          ],
          completed: false
        },
        {
          id: 'documentation-review',
          title: 'Documentation Review',
          description: 'Verify all required documentation is complete',
          instructions: [
            'Check test certificates are included',
            'Verify calibration records are current',
            'Confirm traceability documentation',
            'Review quality inspection records'
          ],
          requiresPhoto: true,
          photoCount: 1,
          completed: false
        }
      ]
    };
  }

  /**
   * Create a custom checklist
   */
  createCustomChecklist(title: string, description: string, items: Partial<ChecklistItem>[]): ChecklistConfig {
    return {
      title,
      description,
      type: 'general',
      items: items.map((item, index) => ({
        id: item.id || `item-${index + 1}`,
        title: item.title || `Item ${index + 1}`,
        description: item.description,
        instructions: item.instructions,
        requiresPhoto: item.requiresPhoto || false,
        photoCount: item.photoCount || 1,
        completed: false,
        photos: []
      }))
    };
  }

  /**
   * Validate checklist completion
   */
  validateChecklist(config: ChecklistConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    config.items.forEach((item, index) => {
      if (!item.completed) {
        errors.push(`Item ${index + 1}: "${item.title}" is not completed`);
      }
      
      if (item.requiresPhoto && (!item.photos || item.photos.length < (item.photoCount || 1))) {
        const required = item.photoCount || 1;
        const current = item.photos?.length || 0;
        errors.push(`Item ${index + 1}: "${item.title}" requires ${required} photo(s), but only ${current} provided`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export checklist data for submission
   */
  exportChecklistData(config: ChecklistConfig): any {
    return {
      title: config.title,
      description: config.description,
      type: config.type,
      completedAt: new Date().toISOString(),
      completionRate: this.getCompletionRate(config),
      items: config.items.map(item => ({
        id: item.id,
        title: item.title,
        completed: item.completed,
        photoCount: item.photos?.length || 0,
        // Note: In real implementation, photos would be uploaded to server
        // and URLs returned instead of File objects
      }))
    };
  }

  private getCompletionRate(config: ChecklistConfig): number {
    const completed = config.items.filter(item => item.completed).length;
    const total = config.items.length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }
}