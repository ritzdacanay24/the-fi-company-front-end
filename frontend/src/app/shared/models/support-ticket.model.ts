export type SupportTicketType =
  | 'bug'
  | 'feature_request'
  | 'question'
  | 'improvement'
  | 'maintenance'
  | 'access_permissions'
  | 'data_correction'
  | 'incident_outage';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: number;
  ticket_number: string;
  type: SupportTicketType;
  title: string;
  description: string;
  user_id: number | null;
  user_email: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigned_to: number | null;
  screenshot_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface SupportTicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  comment: string;
  is_internal: number;
  is_system_generated: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
}

export interface SupportTicketAttachment {
  id: number;
  ticket_id: number;
  comment_id: number | null;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: number;
  created_at: string;
}

export interface CreateSupportTicketDto {
  type: SupportTicketType;
  title: string;
  description: string;
  priority?: SupportTicketPriority;
  screenshot?: string;
  steps?: string;
  metadata?: Record<string, unknown>;
}

export interface SupportTicketFilters {
  type?: SupportTicketType;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  user_id?: number;
  assigned_to?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SUPPORT_TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const SUPPORT_TICKET_TYPE_LABELS: Record<SupportTicketType, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  question: 'Question',
  improvement: 'Improvement',
  maintenance: 'Maintenance',
  access_permissions: 'Access / Permissions',
  data_correction: 'Data Correction',
  incident_outage: 'Incident / Outage',
};
