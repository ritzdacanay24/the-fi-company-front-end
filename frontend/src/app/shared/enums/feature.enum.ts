/**
 * Feature types for attachment uploads
 * Used to route attachments to the correct backend endpoint and S3 bucket paths
 * Maps to actual S3 bucket folder structure
 */
export enum FeatureType {
  PROJECT_MANAGER = 'project-manager',
  NCR = 'ncr',
  QIR = 'qir',
  SUPPORT_TICKETS = 'support-tickets',
  FIELD_SERVICE_REQUEST = 'field-service-request',
  FIELD_SERVICE_TRIP_DETAILS = 'field-service-trip-details',
  PARTS_REQUEST = 'parts-request',
  VEHICLE = 'vehicle',
  CHECKLIST = 'checklist',
  PERMIT_CHECKLIST = 'permit-checklist',
  CHECKLIST_INSTANCE = 'checklist/instance',
  CHECKLIST_LEGACY = 'checklist/legacy-migration',
  CHECKLIST_MANAGE = 'checklist/manage',
  GRAPHICS_BOM = 'graphics-bom',
  INSPECTIONS = 'inspections',
  INSPECTIONS_VEHICLE = 'inspections/vehicle',
  INSPECTIONS_FORKLIFT = 'inspections/forklift',
  LEGACY_MIGRATION = 'legacy-migration',
  RMA = 'rma',
  RECEIVING = 'receiving',
  RESOURCES = 'resources',
  SAFETY_INCIDENT = 'safety-incident',
  SHIPPING_CHECKLIST = 'inspections/shipping',
  SHIPPING_REQUEST = 'shipping-request',
}
