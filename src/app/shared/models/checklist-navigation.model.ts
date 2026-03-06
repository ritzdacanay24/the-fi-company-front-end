import { SafeUrl } from '@angular/platform-browser';

export type ChecklistNavSubmissionType = 'photo' | 'video' | 'audio' | 'either' | 'none';

export interface ChecklistNavItem {
  id: number;
  title: string;
  level: number;
  orderIndex: number;
  submissionType: ChecklistNavSubmissionType;
  isRequired: boolean;
  requiresPhoto: boolean;
  hasPrimarySampleImage: boolean;
  hasSampleVideo: boolean;
  primaryImageUrl?: string | SafeUrl | null;
  sampleVideoUrl?: string | null;
  isInvalid?: boolean;
  searchText?: string;
  isComplete?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
  progressPercent?: number;
  photoCount?: number;
  videoCount?: number;
  isParent?: boolean;
  latestPhotoUrl?: string | null;
}
