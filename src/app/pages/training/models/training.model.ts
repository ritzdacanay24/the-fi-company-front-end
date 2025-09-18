// Training Models and Interfaces

export interface Employee {
  id: number;
  badgeNumber: string;
  badgeId: string; // Alternative property name used in templates
  firstName: string;
  lastName: string;
  position: string;
  title: string; // Alternative property name used in templates  
  department: string;
  email?: string;
}

export interface TrainingSession {
  id: number;
  title: string;
  description: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMinutes: number; // Duration in minutes for calculations
  location: string;
  facilitatorName: string;
  facilitatorSignature?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdBy: number;
  createdDate: string;
  expectedAttendees: TrainingAttendee[];
  actualAttendees: TrainingAttendance[];
  expectedCount?: number; // Expected attendance count from backend
  completedCount?: number; // Completed attendance count from backend
}

export interface TrainingAttendee {
  id: number;
  sessionId: number;
  employeeId: number;
  employee: Employee;
  isRequired: boolean;
  notificationSent: boolean;
  addedDate: string;
  addedBy: number;
}

export interface TrainingAttendance {
  id: number;
  sessionId: number;
  employeeId: number;
  employee: Employee;
  signInTime: string;
  signoffTime: string; // Alternative property name used in templates
  attendanceDuration: number; // Duration in minutes
  badgeScanned: string;
  ipAddress?: string;
  deviceInfo?: string;
  isLateArrival: boolean;
  notes?: string;
}

export interface TrainingMetrics {
  totalExpected: number;
  totalPresent: number;
  completedCount: number; // Number of completed attendees
  attendanceRate: number;
  lateArrivals: number;
  unexpectedAttendees: number;
}

export interface BadgeScanResult {
  success: boolean;
  employee?: Employee;
  message: string;
  alreadySignedIn?: boolean;
  isExpectedAttendee?: boolean;
}

export interface CreateTrainingSessionRequest {
  title: string;
  description: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  facilitatorName: string;
  expectedAttendeeIds: number[];
}

export interface UpdateAttendanceRequest {
  sessionId: number;
  badgeNumber: string;
  notes?: string;
}

export interface TrainingTemplate {
  id?: number;
  name: string; // Maps to 'name' in database
  titleTemplate: string; // Maps to 'title_template' in database
  descriptionTemplate?: string; // Maps to 'description_template' in database
  purposeTemplate?: string; // Maps to 'purpose_template' in database
  defaultDurationMinutes: number; // Maps to 'default_duration_minutes' in database
  defaultLocation?: string; // Maps to 'default_location' in database
  categoryId?: number; // Maps to 'category_id' in database
  isActive: boolean; // Maps to 'is_active' in database
  createdBy: number; // Maps to 'created_by' in database
  createdDate: string; // Maps to 'created_date' in database
  
  // Additional computed/display properties (not in database)
  category?: string; // Category name for display (from join)
}

export interface TrainingTemplateCategory {
  id: number;
  name: string;
  description?: string;
  color?: string; // For UI display purposes
  isActive?: boolean;
}

export interface TemplateUsageStats {
  templateId: number;
  usageCount: number;
  lastUsedDate: string;
  popularityRank: number;
}