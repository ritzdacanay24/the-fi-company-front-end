export interface ScheduledJobDefinition {
  id: string;
  name: string;
  cron: string;
  url: string;
  active: boolean;
  note?: string;
}

export const SCHEDULED_JOBS_TIMEZONE = 'America/Los_Angeles';

export const SCHEDULED_JOB_DEFINITIONS: ScheduledJobDefinition[] = [
  {
    id: 'graphics-due-today-report',
    name: 'Graphics Due Today Report',
    cron: '30 22 * * *',
    url: 'nest://graphics-production/getDueTodayReport',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'dashboard-performance',
    name: 'Dashboard Performance',
    cron: '*/30 * * * *',
    url: 'nest://scheduled-jobs/dashboard-performance',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'dropin-workorder-emails',
    name: 'Drop-in Work Order Emails',
    cron: '*/30 * * * 1-5',
    url: 'nest://scheduled-jobs/dropin-workorder-emails',
    active: true,
  },
  {
    id: 'clean-db-sessions',
    name: 'Clean DB Sessions',
    cron: '0 0 * * *',
    url: 'nest://scheduled-jobs/clean-db-sessions',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'clean-tokens',
    name: 'Clean Tokens',
    cron: '*/5 * * * *',
    url: 'nest://scheduled-jobs/clean-tokens',
    active: true,
  },
  {
    id: 'clean-users',
    name: 'Clean Users',
    cron: '*/6 * * * *',
    url: 'nest://scheduled-jobs/clean-users',
    active: true,
  },
  {
    id: 'total-shipped-orders',
    name: 'Total Shipped Orders',
    cron: '0 16 * * 1-5',
    url: 'nest://scheduled-jobs/total-shipped-orders',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'shipping-changes',
    name: 'Shipping Changes',
    cron: '0 4 * * 1-5',
    url: 'nest://scheduled-jobs/shipping-changes',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'overdue-orders',
    name: 'Overdue Orders',
    cron: '0 4 * * 1-5',
    url: 'nest://scheduled-jobs/overdue-orders',
    active: true,
  },
  {
    id: 'field-service-old-workorders',
    name: 'Field Service Old Work Orders',
    cron: '0 9 * * * 1-5',
    url: 'nest://scheduled-jobs/field-service-old-workorders',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'open-shipping-requests',
    name: 'Open Shipping Requests',
    cron: '* * * * *',
    url: 'nest://scheduled-jobs/open-shipping-requests',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'graphics-work-order',
    name: 'Graphics Work Order',
    cron: '*/20 * * * *',
    url: 'nest://scheduled-jobs/graphics-work-order',
    active: true,
  },
  {
    id: 'certificate-of-compliance',
    name: 'Certificate of Compliance',
    cron: '20 15 * * *',
    url: 'nest://scheduled-jobs/certificate-of-compliance',
    active: false,
    note: 'Disabled',
  },
  {
    id: 'vehicle-expiration-email',
    name: 'Vehicle Expiration Email',
    cron: '0 7 * * *',
    url: 'nest://scheduled-jobs/vehicle-expiration-email',
    active: true,
  },
  {
    id: 'daily-report-insert',
    name: 'Daily Report Insert',
    cron: '0 16 * * 1-5',
    url: 'nest://scheduled-jobs/daily-report-insert',
    active: true,
  },
  {
    id: 'completed-production-orders',
    name: 'Completed Production Orders',
    cron: '0 4 * * 1-5',
    url: 'nest://scheduled-jobs/completed-production-orders',
    active: true,
  },
  {
    id: 'inspection-email',
    name: 'Inspection Email',
    cron: '0 14 * * 1-5',
    url: 'nest://scheduled-jobs/inspection-email',
    active: true,
  },
  {
    id: 'fs-job-report-morning',
    name: 'FS Job Report (Morning)',
    cron: '0 4 * * 1-5',
    url: 'nest://scheduled-jobs/fs-job-report-morning',
    active: true,
  },
  {
    id: 'fs-job-report-evening',
    name: 'FS Job Report (Evening)',
    cron: '0 17 * * 1-5',
    url: 'nest://scheduled-jobs/fs-job-report-evening',
    active: true,
  },
  {
    id: 'past-due-field-service-requests',
    name: 'Past Due Field Service Requests',
    cron: '0 6 * * 1-5',
    url: 'nest://scheduled-jobs/past-due-field-service-requests',
    active: true,
  },
  {
    id: 'lnw-delivery',
    name: 'LNW Delivery',
    cron: '0 7 * * 1-5',
    url: 'nest://scheduled-jobs/lnw-delivery',
    active: true,
  },
  {
    id: 'fs-job-notice',
    name: 'FS Job Notice',
    cron: '0 4 * * 1-5',
    url: 'nest://scheduled-jobs/fs-job-notice',
    active: true,
  },
];
