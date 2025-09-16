export interface ChecklistItemTemplate {
  id: string;
  title: string;
  description?: string;
  instructions?: string[];
  requiresPhoto?: boolean;
  photoCount?: number;
  samplePhotos?: string[]; // URLs to sample/reference photos
  photoInstructions?: string; // Specific photo requirements
  category?: string; // Quality, Safety, Equipment, etc.
  isRequired?: boolean;
  order: number;
}

// Add ChecklistItem interface for template items
export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  type: 'check' | 'text' | 'number' | 'photo' | 'measure';
  required?: boolean;
  samplePhotoUrl?: string;
  minQualityScore?: number;
  requiresSampleMatch?: boolean;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'visual' | 'dimensional' | 'functional' | 'documentation' | 'photo-inspection' | 'shipping' | 'quality' | 'safety' | 'equipment' | 'general';
  category: string; // Department or use case
  version: string;
  status?: 'active' | 'draft' | 'archived';
  isActive?: boolean;
  items: ChecklistItem[];
  createdBy?: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  estimatedTime?: number; // minutes
  requiredRole?: string; // Who can use this template
}

// Instance when user performs inspection using template
export interface ChecklistInstance {
  id: string;
  templateId: string;
  template: ChecklistTemplate; // Include full template
  templateName?: string;
  templateVersion?: string;
  status: 'draft' | 'in-progress' | 'pending' | 'completed' | 'submitted';
  assignedTo: string;
  assignedToName?: string;
  startedDate: string;
  completedDate?: string;
  submittedDate?: string;
  location?: string;
  workOrderId?: string;
  items: ChecklistInstanceItem[];
  notes?: string;
  signature?: string; // Base64 signature
  photos?: string[]; // General photos not tied to specific items
}

export interface ChecklistInstanceItem {
  id: string;
  templateItemId: string;
  title: string;
  description?: string;
  instructions?: string[];
  requiresPhoto?: boolean;
  photoCount?: number;
  samplePhotos?: string[];
  photoInstructions?: string;
  completed: boolean;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  value?: any; // The user's input/response
  photos?: InspectionPhoto[];
  notes?: string;
  completedDate?: string;
  completedBy?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface InspectionPhoto {
  id: string;
  file?: File;
  url: string;
  thumbnail?: string;
  filename: string;
  fileName?: string; // Add alias for compatibility
  uploadDate: string;
  fileSize: number;
  mimeType: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  matchesSample?: boolean; // AI comparison result
  qualityScore?: number; // 0-100 quality score
  notes?: string;
}

// Add analytics interface
export interface ChecklistTemplateAnalytics {
  totalTemplates: number;
  activeTemplates: number;
  totalInstances: number;
  completedInstances: number;
  averageCompletionTime: number;
  templateUsage: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
    averageTime: number;
  }>;
}

// Template categories for organization
export const CHECKLIST_CATEGORIES = {
  QUALITY: 'Quality Control',
  SAFETY: 'Safety Inspection',
  EQUIPMENT: 'Equipment Check',
  SHIPPING: 'Shipping & Logistics',
  MAINTENANCE: 'Maintenance',
  COMPLIANCE: 'Compliance Audit',
  RECEIVING: 'Receiving Inspection',
  GENERAL: 'General Inspection'
} as const;

// Template types with specific purposes
export const TEMPLATE_TYPES = {
  'photo-inspection': 'Photo-based Inspection',
  'shipping': 'Shipping & Packaging',
  'quality': 'Quality Control',
  'safety': 'Safety Check',
  'equipment': 'Equipment Inspection',
  'general': 'General Checklist'
} as const;