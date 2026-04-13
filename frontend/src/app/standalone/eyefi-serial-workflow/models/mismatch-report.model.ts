/**
 * Model for Serial Number Sequence Mismatch Reports
 * Used when physical devices don't match expected database sequence
 */
export interface MismatchReport {
  // Auto-captured information
  id?: number;
  workOrderNumber: string;
  category: 'new' | 'used';
  reportedBy: string;
  reportedByUserId?: number;
  timestamp: Date;
  
  // User-provided information
  rowIndex: number | null;
  rowNumber?: number; // Display number (rowIndex + 1)
  step?: 'step4' | 'step5-igt' | 'step5-sg' | 'step5-ags'; // Which step/customer type
  
  // Expected vs Physical - EyeFi & UL (Step 4)
  expectedEyefiSerial?: string;
  expectedUlNumber?: string;
  physicalEyefiSerial?: string;
  physicalUlNumber?: string;
  
  // Expected vs Physical - Customer Serial Numbers (Step 5)
  // Note: IGT, SG, AGS have their OWN serial number sequences (e.g., IGT-2024-00015)
  // These are NOT related to EyeFi serials - they are customer-specific sequences
  expectedCustomerSerial?: string;    // e.g., 'IGT-2024-00015', 'LW-2024-00020', 'AGS-2024-00030'
  physicalCustomerSerial?: string;    // What's actually on the customer's label
  customerType?: 'igt' | 'sg' | 'ags'; // Derived from step
  
  // Reference fields (for context only, not for mismatch comparison)
  referenceEyefiSerial?: string;      // EyeFi serial associated with this customer serial (Step 5 only)
  referenceUlNumber?: string;         // UL label associated with this customer serial (Step 5 only)
  
  // Additional context
  notes?: string;
  photoBase64?: string;
  photoPreview?: string;
  contactMethod: 'workstation' | 'phone';
  contactInfo?: string;
  
  // Investigation tracking (admin updates)
  status?: 'reported' | 'investigating' | 'resolved' | 'cancelled';
  investigatedBy?: string;
  investigatedByUserId?: number;
  investigationNotes?: string;
  resolutionDate?: Date;
  resolutionAction?: string;
  rootCause?: 'receiving_error' | 'mislabeling' | 'already_consumed' | 'physical_wrong_order' | 'duplicate' | 'other';
}

/**
 * Summary statistics for mismatch reports
 */
export interface MismatchReportSummary {
  totalReports: number;
  byStatus: {
    reported: number;
    investigating: number;
    resolved: number;
    cancelled: number;
  };
  byRootCause: {
    [key: string]: number;
  };
  averageResolutionTimeHours: number;
  recentReports: MismatchReport[];
}
