/**
 * Feature types for attachment uploads
 * Used to route attachments to the correct database tables and S3 prefixes
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
  COMPUTER_MANAGEMENT = 'computer-management',
  COMPUTER_MAINTENANCE_SERVICE = 'computer-maintenance-service',
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

/**
 * Feature configuration mapping
 * Uses standardized snake_case names for new uploads
 * Maintains backward compatibility by mapping to legacy field names in database
 * Legacy names are automatically queried when retrieving existing records
 */
export const FEATURE_CONFIG: Record<FeatureType, { s3Prefix: string; field: string; legacyNames?: string[] }> = {
  // STATUS: LOCKED - Project manager header and gate attachments mapping finalized and aligned.
  [FeatureType.PROJECT_MANAGER]: {
    s3Prefix: 'project-manager/{id}',
    field: 'project_manager',
    legacyNames: ['project_manager', 'Project Manager'],
  },
  // STATUS: LOCKED - Project manager task attachments are isolated from project header attachments.
  [FeatureType.PROJECT_MANAGER_TASK]: {
    s3Prefix: 'project-manager-task/{id}',
    field: 'project_manager_task',
    legacyNames: ['project_manager_task'],
  },
  // STATUS: LOCKED - NCR mapping finalized and aligned.
  [FeatureType.NCR]: {
    s3Prefix: 'ncr/{id}',
    field: 'ncr',
    legacyNames: ['NCR'],
  },
  // STATUS: LOCKED - QIR mapping finalized and aligned.
  [FeatureType.QIR]: {
    s3Prefix: 'qir/{id}',
    field: 'capa_request',
    legacyNames: ['Capa Request'],
  },
  // STATUS: LOCKED - Support tickets mapping finalized and aligned.
  [FeatureType.SUPPORT_TICKETS]: {
    s3Prefix: 'support-tickets/{id}',
    field: 'support_ticket',
    legacyNames: ['support_ticket'],
  },
  // STATUS: LOCKED - Field service request mapping finalized and aligned.
  [FeatureType.FIELD_SERVICE_REQUEST]: {
    s3Prefix: 'field-service-request/{id}',
    field: 'field_service_request',
    legacyNames: ['Field Service Request'],
  },
  // STATUS: LOCKED - Field service ticket mapping keeps legacy field naming.
  [FeatureType.FIELD_SERVICE_TICKET]: {
    s3Prefix: 'field-service-ticket/{id}',
    field: 'field_service_ticket',
    legacyNames: ['Field Service'],
  },
  // STATUS: LOCKED - Field service trip details mapping finalized and aligned.
  [FeatureType.FIELD_SERVICE_TRIP_DETAILS]: {
    s3Prefix: 'field-service-trip-details/{id}',
    field: 'field_service_trip_details',
    legacyNames: ['Field Service Trip Details'],
  },
  // STATUS: LOCKED - Parts request mapping finalized and aligned.
  [FeatureType.PARTS_REQUEST]: {
    s3Prefix: 'parts-request/{id}',
    field: 'parts_order',
    legacyNames: ['FS Parts Order'],
  },
  // STATUS: LOCKED - Vehicle management mapping finalized and aligned.
  [FeatureType.VEHICLE_MANAGEMENT]: {
    s3Prefix: 'vehicle-management/{id}',
    field: 'vehicle_management',
    legacyNames: ['Vehicle Management', 'Vehicle Information'],
  },
  [FeatureType.VEHICLE_MAINTENANCE_SERVICE]: {
    s3Prefix: 'vehicle-maintenance-service/{id}',
    field: 'vehicle_maintenance_service',
    legacyNames: [],
  },
  [FeatureType.FORKLIFT_MANAGEMENT]: {
    s3Prefix: 'forklift-management/{id}',
    field: 'forklift_management',
    legacyNames: [],
  },
  [FeatureType.FORKLIFT_MAINTENANCE_SERVICE]: {
    s3Prefix: 'forklift-maintenance-service/{id}',
    field: 'forklift_maintenance_service',
    legacyNames: [],
  },
  [FeatureType.COMPUTER_MANAGEMENT]: {
    s3Prefix: 'computer-management/{id}',
    field: 'computer_management',
    legacyNames: [],
  },
  [FeatureType.COMPUTER_MAINTENANCE_SERVICE]: {
    s3Prefix: 'computer-maintenance-service/{id}',
    field: 'computer_maintenance_service',
    legacyNames: [],
  },
  [FeatureType.CHECKLIST]: {
    s3Prefix: 'checklist/{id}',
    field: 'checklist',
    legacyNames: ['CheckList'],
  },
  // STATUS: LOCKED - Permit checklist mapping finalized and aligned.
  [FeatureType.PERMIT_CHECKLIST]: {
    s3Prefix: 'permit-checklist/{id}',
    field: 'permit_checklist',
    legacyNames: ['permit_checklist'],
  },
  [FeatureType.CHECKLIST_INSTANCE]: {
    s3Prefix: 'checklist-instance/{id}',
    field: 'checklist_instance',
    legacyNames: ['CheckList'],
  },
  [FeatureType.CHECKLIST_MANAGE]: {
    s3Prefix: 'checklist-manage/{id}',
    field: 'checklist_manage',
    legacyNames: ['CheckList'],
  },
  // STATUS: LOCKED - Graphics BOM mapping finalized and aligned.
  [FeatureType.GRAPHICS_BOM]: {
    s3Prefix: 'graphics-bom/{id}',
    field: 'graphics_bom',
    legacyNames: ['graphics_bom'],
  },
  // STATUS: LOCKED - Vehicle inspection mapping finalized and kept separate from vehicle management.
  [FeatureType.INSPECTIONS_VEHICLE]: {
    s3Prefix: 'vehicle-inspection/{id}',
    field: 'vehicle_inspection',
    legacyNames: ['Incoming Inspections', 'Vehicle Inspection'],
  },
  // STATUS: LOCKED - Forklift inspection mapping finalized.
  [FeatureType.INSPECTIONS_FORKLIFT]: {
    s3Prefix: 'forklift-inspection/{id}',
    field: 'forklift_inspection',
    legacyNames: ['forklift_inspection'],
  },
  // STATUS: LOCKED - RMA mapping finalized and aligned.
  [FeatureType.RMA]: {
    s3Prefix: 'rma/{id}',
    field: 'rma',
    legacyNames: ['RMA'],
  },
  // STATUS: LOCKED - Receiving mapping finalized and aligned.
  [FeatureType.RECEIVING]: {
    s3Prefix: 'receiving/{id}',
    field: 'receiving',
    legacyNames: ['receiving', 'LOGISTICS_CALENDAR'],
  },
  // STATUS: LOCKED - Resources mapping finalized and aligned.
  [FeatureType.RESOURCES]: {
    s3Prefix: 'resources/{id}',
    field: 'resources',
    legacyNames: ['resources'],
  },
  // STATUS: LOCKED - Safety incident legacy naming finalized.
  [FeatureType.SAFETY_INCIDENT]: {
    s3Prefix: 'safety-incident/{id}',
    field: 'safety_incident',
    legacyNames: ['safety-incident'],
  },
  // STATUS: LOCKED - Shipping checklist mapping finalized and aligned.
  [FeatureType.SHIPPING_CHECKLIST]: {
    s3Prefix: 'shipping-checklist/{id}',
    field: 'shipping_checklist',
    legacyNames: ['shipping_checklist'],
  },
  // STATUS: LOCKED - Shipping request mapping finalized and aligned.
  [FeatureType.SHIPPING_REQUEST]: {
    s3Prefix: 'shipping-request/{id}',
    field: 'shipping_request',
    legacyNames: ['Shipping Request'],
  },
};
