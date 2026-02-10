/**
 * Enterprise-grade Checklist Template Models
 * Follows industry best practices for API response structure
 */

// ============================================
// API Response Models (what frontend receives)
// ============================================

export interface ChecklistTemplateResponse {
  id: number;
  quality_document: QualityDocumentReference | null;
  name: string;
  description: string;
  metadata: TemplateMetadata;
  version: string;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  items: ChecklistItemResponse[];
}

export interface QualityDocumentReference {
  id: number;
  number: string;
  revision_id: number;
  revision_number: number;
  title: string;
}

export interface TemplateMetadata {
  part_number: string;
  product_type: string;
  category: 'quality_control' | 'installation' | 'maintenance' | 'inspection';
  customer_part_number?: string;
  revision?: string;
  original_filename?: string;
}

export interface ChecklistItemResponse {
  id: number;
  order: number;
  title: string;
  description: string;
  is_required: boolean;
  submission_type: 'photo' | 'video' | 'either' | 'none';
  links?: ItemLink[];
  requirements: ItemRequirements;
  media: ItemMedia;
  children: ChecklistItemResponse[];
}

export interface ItemRequirements {
  photo?: PhotoRequirements;
  video?: VideoRequirements;
}

export interface PhotoRequirements {
  min_count: number;
  max_count: number;
  required: boolean;
  capture?: CaptureGuidelines;
}

export interface VideoRequirements {
  max_duration_seconds: number;
  required?: boolean;
}

export interface CaptureGuidelines {
  angle?: string;
  distance?: string;
  lighting?: string;
  focus?: string;
}

export interface ItemMedia {
  sample_images: MediaItem[];
  sample_videos: MediaItem[];
}

export interface ItemLink {
  title: string;
  url: string;
  description?: string;
}

export interface MediaItem {
  id?: number;
  url: string;
  label?: string;
  description?: string;
  type: 'sample' | 'reference' | 'defect_example' | 'diagram';
  is_primary: boolean;
  order: number;
}

// ============================================
// Database Models (flat structure for storage)
// ============================================

export interface ChecklistTemplateDB {
  id: number;
  quality_document_id: number | null;
  quality_revision_id: number | null;
  name: string;
  description: string;
  part_number: string;
  customer_part_number: string;
  revision: string;
  original_filename: string;
  review_date: string;
  revision_details: string;
  revised_by: string;
  product_type: string;
  category: string;
  version: string;
  parent_template_id: number | null;
  is_active: 0 | 1;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  template_group_id: number;
}

export interface ChecklistItemDB {
  id: number;
  template_id: number;
  order_index: number;
  parent_id: number | null;
  level: number;
  title: string;
  description: string;
  photo_requirements: string; // JSON string
  sample_image_url: string;
  is_required: 0 | 1;
  submission_type: 'photo' | 'video' | 'either' | 'none';
  sample_videos: string; // JSON string
  sample_video_url: string | null;
  video_requirements: string; // JSON string
  min_photos: number;
  max_photos: number;
  links?: string; // JSON string
}

// ============================================
// Transformation Utilities
// ============================================

export class ChecklistTemplateTransformer {
  
  /**
   * Transform database response to clean API format
   */
  static toApiResponse(dbTemplate: any): ChecklistTemplateResponse {
    const items = dbTemplate.items || [];
    
    return {
      id: dbTemplate.id,
      quality_document: dbTemplate.quality_document_metadata ? {
        id: dbTemplate.quality_document_metadata.document_id,
        number: dbTemplate.quality_document_metadata.document_number,
        revision_id: dbTemplate.quality_document_metadata.revision_id,
        revision_number: dbTemplate.quality_document_metadata.revision_number,
        title: dbTemplate.quality_document_metadata.title
      } : null,
      name: dbTemplate.name,
      description: dbTemplate.description || '',
      metadata: {
        part_number: dbTemplate.part_number || '',
        product_type: dbTemplate.product_type || '',
        category: dbTemplate.category || 'quality_control',
        customer_part_number: dbTemplate.customer_part_number,
        revision: dbTemplate.revision,
        original_filename: dbTemplate.original_filename
      },
      version: dbTemplate.version || '1.0',
      is_active: this.toBoolean(dbTemplate.is_active),
      created_at: dbTemplate.created_at,
      updated_at: dbTemplate.updated_at,
      items: this.transformItemsToNested(items)
    };
  }

  /**
   * Transform flat items array to nested hierarchy
   */
  static transformItemsToNested(flatItems: any[]): ChecklistItemResponse[] {
    const itemMap = new Map<number, ChecklistItemResponse>();
    const rootItems: ChecklistItemResponse[] = [];

    // First pass: Create all items
    flatItems.forEach(item => {
      const transformedItem = this.transformItem(item);
      itemMap.set(item.id, transformedItem);
    });

    // Second pass: Build hierarchy
    flatItems.forEach(item => {
      const transformedItem = itemMap.get(item.id)!;
      
      if (item.parent_id && itemMap.has(item.parent_id)) {
        // Has parent - add to parent's children
        const parent = itemMap.get(item.parent_id)!;
        parent.children.push(transformedItem);
      } else {
        // No parent - it's a root item
        rootItems.push(transformedItem);
      }
    });

    // Sort by order at each level
    this.sortItemsRecursive(rootItems);
    
    return rootItems;
  }

  /**
   * Transform single item from DB to API format
   */
  static transformItem(dbItem: any): ChecklistItemResponse {
    const photoReq = dbItem.photo_requirements || {};
    const videoReq = dbItem.video_requirements || {};
    const rawLinks = dbItem.links ?? [];
    const links = typeof rawLinks === 'string' ? (JSON.parse(rawLinks) || []) : rawLinks;
    
    return {
      id: dbItem.id,
      order: dbItem.order_index || 0,
      title: dbItem.title || '',
      description: dbItem.description || '',
      is_required: this.toBoolean(dbItem.is_required),
      submission_type: dbItem.submission_type || 'photo',
      links: Array.isArray(links) ? links : [],
      requirements: {
        photo: dbItem.submission_type !== 'video' ? {
          min_count: photoReq.min_photos ?? 0,
          max_count: photoReq.max_photos ?? 10,
          required: this.toBoolean(photoReq.picture_required ?? true),
          capture: {
            angle: photoReq.angle || '',
            distance: photoReq.distance || '',
            lighting: photoReq.lighting || '',
            focus: photoReq.focus || ''
          }
        } : undefined,
        video: dbItem.submission_type !== 'photo' ? {
          max_duration_seconds: photoReq.max_video_duration_seconds || videoReq.max_video_duration_seconds || 30
        } : undefined
      },
      media: {
        sample_images: this.transformMediaArray(dbItem.sample_images),
        sample_videos: this.transformMediaArray(dbItem.sample_videos)
      },
      children: []
    };
  }

  /**
   * Transform media array to clean format
   */
  static transformMediaArray(mediaArray: any[]): MediaItem[] {
    if (!Array.isArray(mediaArray)) return [];
    
    return mediaArray.map((item, index) => ({
      id: item.id,
      url: item.url || '',
      label: item.label || '',
      description: item.description || '',
      type: item.image_type || item.type || 'sample',
      is_primary: this.toBoolean(item.is_primary),
      order: item.order_index ?? index
    }));
  }

  /**
   * Transform clean API format to database payload
   */
  static toDatabasePayload(apiData: Partial<ChecklistTemplateResponse>): any {
    return {
      name: apiData.name,
      description: apiData.description,
      part_number: apiData.metadata?.part_number || '',
      product_type: apiData.metadata?.product_type || '',
      category: apiData.metadata?.category || 'quality_control',
      customer_part_number: apiData.metadata?.customer_part_number || '',
      revision: apiData.metadata?.revision || '',
      original_filename: apiData.metadata?.original_filename || '',
      version: apiData.version || '1.0',
      is_active: apiData.is_active ? 1 : 0,
      quality_document_id: apiData.quality_document?.id || null,
      items: this.flattenItems(apiData.items || [])
    };
  }

  /**
   * Flatten nested items to flat array with parent_id and level
   */
  static flattenItems(nestedItems: ChecklistItemResponse[], parentId: number | null = null, level: number = 0): any[] {
    const result: any[] = [];
    
    nestedItems.forEach((item, index) => {
      // Add the item itself
      result.push({
        id: item.id,
        order_index: item.order || (index + 1),
        parent_id: parentId,
        level: level,
        title: item.title,
        description: item.description,
        is_required: item.is_required,
        submission_type: item.submission_type,
        photo_requirements: {
          angle: item.requirements.photo?.capture?.angle || '',
          distance: item.requirements.photo?.capture?.distance || '',
          lighting: item.requirements.photo?.capture?.lighting || '',
          focus: item.requirements.photo?.capture?.focus || '',
          min_photos: item.requirements.photo?.min_count ?? null,
          max_photos: item.requirements.photo?.max_count ?? null,
          picture_required: item.requirements.photo?.required ?? true,
          max_video_duration_seconds: item.requirements.video?.max_duration_seconds || 30
        },
        sample_images: item.media.sample_images,
        sample_videos: item.media.sample_videos
      });
      
      // Recursively add children
      if (item.children && item.children.length > 0) {
        const childrenFlat = this.flattenItems(item.children, item.id, level + 1);
        result.push(...childrenFlat);
      }
    });
    
    return result;
  }

  /**
   * Sort items recursively by order
   */
  private static sortItemsRecursive(items: ChecklistItemResponse[]): void {
    items.sort((a, b) => a.order - b.order);
    items.forEach(item => {
      if (item.children.length > 0) {
        this.sortItemsRecursive(item.children);
      }
    });
  }

  /**
   * Convert database 1/0 or "1"/"0" to boolean
   */
  private static toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
    return !!value;
  }
}
