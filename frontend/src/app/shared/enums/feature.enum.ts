/**
 * Feature types for attachment uploads
 * Used to route attachments to the correct backend endpoint and S3 bucket paths
 * Maps to actual S3 bucket folder structure
 */
export enum FeatureType {
  PROJECT_MANAGER = 'project-manager',
  PROJECT_MANAGER_TASK = 'project-manager-task',
  NCR = 'ncr',
  QIR = 'qir',
  SUPPORT_TICKETS = 'support-tickets',
  FIELD_SERVICE_REQUEST = 'field-service-request',
  FIELD_SERVICE_TICKET = 'field-service-ticket',
  FIELD_SERVICE_TRIP_DETAILS = 'field-service-trip-details',
  PARTS_REQUEST = 'parts-request',
  VEHICLE_MANAGEMENT = 'vehicle-management',
  VEHICLE_MAINTENANCE_SERVICE = 'vehicle-maintenance-service',
  FORKLIFT_MANAGEMENT = 'forklift-management',
  FORKLIFT_MAINTENANCE_SERVICE = 'forklift-maintenance-service',
  CHECKLIST = 'checklist',
  PERMIT_CHECKLIST = 'permit-checklist',
  CHECKLIST_INSTANCE = 'checklist-instance',
  CHECKLIST_MANAGE = 'checklist-manage',
  GRAPHICS_BOM = 'graphics-bom',
  INSPECTIONS_VEHICLE = 'vehicle-inspection',
  INSPECTIONS_FORKLIFT = 'forklift-inspection',
  RMA = 'rma',
  RECEIVING = 'receiving',
  RESOURCES = 'resources',
  SAFETY_INCIDENT = 'safety-incident',
  SHIPPING_CHECKLIST = 'shipping-checklist',
  SHIPPING_REQUEST = 'shipping-request',
}
