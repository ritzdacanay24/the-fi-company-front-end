/**
 * Ticket System Interfaces (Frontend)
 *
 * Simple ticketing for bug reports, feature requests, and support questions
 */

export enum TicketType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  QUESTION = 'question',
  IMPROVEMENT = 'improvement',
  MAINTENANCE = 'maintenance',
  ACCESS_PERMISSIONS = 'access_permissions',
  DATA_CORRECTION = 'data_correction',
  INCIDENT_OUTAGE = 'incident_outage'
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TicketImpactLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TicketUrgencyLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface TicketMetadata {
  steps?: string;
  browser?: string;
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
  requestFor?: string;
  onBehalfOfSomeoneElse?: boolean;
  impactLevel?: TicketImpactLevel;
  urgencyLevel?: TicketUrgencyLevel;
  updateRecipients?: string;
  [key: string]: any;
}

export interface Ticket {
  id: number;
  ticket_number: string;

  type: TicketType;
  title: string;
  description: string;

  user_id: number | null;
  user_email: string | null;

  status: TicketStatus;
  priority: TicketPriority;

  assigned_to: number | null;
  screenshot_path: string | null;
  error_report_id: number | null;

  metadata: TicketMetadata | null;

  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  closed_at: Date | null;
}

export interface CreateTicketDto {
  type: TicketType;
  title: string;
  description: string;
  priority?: TicketPriority;
  screenshot?: string;
  steps?: string;
  metadata?: TicketMetadata;
  error_report_id?: number;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: number | null;
  metadata?: Partial<TicketMetadata>;
}

export interface TicketFilters {
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  user_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.BUG]: '🐛 Bug Report',
  [TicketType.FEATURE_REQUEST]: '✨ Feature Request',
  [TicketType.QUESTION]: '❓ Question',
  [TicketType.IMPROVEMENT]: '💡 Improvement',
  [TicketType.MAINTENANCE]: '🛠️ Maintenance Task',
  [TicketType.ACCESS_PERMISSIONS]: '🔐 Access / Permissions',
  [TicketType.DATA_CORRECTION]: '🧾 Data Correction',
  [TicketType.INCIDENT_OUTAGE]: '🚨 Incident / Outage'
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Low',
  [TicketPriority.MEDIUM]: 'Medium',
  [TicketPriority.HIGH]: 'High',
  [TicketPriority.URGENT]: 'Urgent'
};

export const TICKET_IMPACT_LABELS: Record<TicketImpactLevel, string> = {
  [TicketImpactLevel.HIGH]: 'High - Major business function or critical service unavailable',
  [TicketImpactLevel.MEDIUM]: 'Medium - Service degradation for a department or subset of users',
  [TicketImpactLevel.LOW]: 'Low - Inconvenience to one user'
};

export const TICKET_URGENCY_LABELS: Record<TicketUrgencyLevel, string> = {
  [TicketUrgencyLevel.HIGH]: 'High - Immediate resolution needed to prevent major disruption',
  [TicketUrgencyLevel.MEDIUM]: 'Medium - Needs prompt action but workaround available',
  [TicketUrgencyLevel.LOW]: 'Low - Can be scheduled for normal service hours'
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.IN_PROGRESS]: 'In Progress',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed'
};
