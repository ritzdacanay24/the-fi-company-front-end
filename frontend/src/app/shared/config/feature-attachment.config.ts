import { FeatureType } from '@app/shared/enums/feature.enum';

/**
 * Feature attachment configuration
 * Uses standardized snake_case naming for new uploads
 * Maintains backward compatibility with existing legacy field names
 * Legacy names are automatically queried when retrieving existing records
 */
export interface FeatureAttachmentConfig {
  feature: FeatureType;
  s3Path: string;
  dbField: string;
  legacyNames: string[];
  description: string;
}

export const FEATURE_ATTACHMENT_CONFIG: Record<FeatureType, FeatureAttachmentConfig> = {
  // STATUS: LOCKED - Project manager header and gate attachments mapping finalized and aligned.
  [FeatureType.PROJECT_MANAGER]: {
    feature: FeatureType.PROJECT_MANAGER,
    s3Path: 'project-manager',
    dbField: 'project_manager',
    legacyNames: ['project_manager', 'Project Manager'],
    description: 'Project manager attachments',
  },
  // STATUS: LOCKED - Project manager task attachments are isolated from project header attachments.
  [FeatureType.PROJECT_MANAGER_TASK]: {
    feature: FeatureType.PROJECT_MANAGER_TASK,
    s3Path: 'project-manager-task',
    dbField: 'project_manager_task',
    legacyNames: ['project_manager_task'],
    description: 'Project manager task attachments',
  },
  // STATUS: LOCKED - NCR mapping finalized and aligned.
  [FeatureType.NCR]: {
    feature: FeatureType.NCR,
    s3Path: 'ncr',
    dbField: 'ncr',
    legacyNames: ['NCR'],
    description: 'NCR attachments',
  },
  [FeatureType.QIR]: {
    feature: FeatureType.QIR,
    s3Path: 'qir',
    dbField: 'capa_request',
    legacyNames: ['Capa Request'],
    description: 'Quality incident report attachments',
  },
  [FeatureType.SUPPORT_TICKETS]: {
    feature: FeatureType.SUPPORT_TICKETS,
    s3Path: 'support-tickets',
    dbField: 'support_ticket',
    legacyNames: ['support_ticket'],
    description: 'Support ticket attachments (3 records)',
  },
  // STATUS: LOCKED - Field service request mapping finalized and aligned.
  [FeatureType.FIELD_SERVICE_REQUEST]: {
    feature: FeatureType.FIELD_SERVICE_REQUEST,
    s3Path: 'field-service-request',
    dbField: 'field_service_request',
    legacyNames: ['Field Service Request'],
    description: 'Field service request attachments',
  },
  // STATUS: LOCKED - Field service ticket mapping keeps legacy field naming.
  [FeatureType.FIELD_SERVICE_TICKET]: {
    feature: FeatureType.FIELD_SERVICE_TICKET,
    s3Path: 'field-service-ticket',
    dbField: 'field_service_ticket',
    legacyNames: ['Field Service'],
    description: 'Field service ticket attachments',
  },
  // STATUS: LOCKED - Field service trip details mapping finalized and aligned.
  [FeatureType.FIELD_SERVICE_TRIP_DETAILS]: {
    feature: FeatureType.FIELD_SERVICE_TRIP_DETAILS,
    s3Path: 'field-service-trip-details',
    dbField: 'field_service_trip_details',
    legacyNames: ['Field Service Trip Details'],
    description: 'Field service trip details attachments',
  },
  // STATUS: LOCKED - Parts request mapping finalized and aligned.
  [FeatureType.PARTS_REQUEST]: {
    feature: FeatureType.PARTS_REQUEST,
    s3Path: 'parts-request',
    dbField: 'parts_order',
    legacyNames: ['FS Parts Order', 'parts_order'],
    description: 'Parts request attachments (239 records)',
  },
  // STATUS: LOCKED - Vehicle management mapping finalized and aligned.
  [FeatureType.VEHICLE_MANAGEMENT]: {
    feature: FeatureType.VEHICLE_MANAGEMENT,
    s3Path: 'vehicle-management',
    dbField: 'vehicle_management',
    legacyNames: ['Vehicle Management', 'Vehicle Information'],
    description: 'Vehicle attachments',
  },
  [FeatureType.VEHICLE_MAINTENANCE_SERVICE]: {
    feature: FeatureType.VEHICLE_MAINTENANCE_SERVICE,
    s3Path: 'vehicle-maintenance-service',
    dbField: 'vehicle_maintenance_service',
    legacyNames: [],
    description: 'Vehicle maintenance service attachments',
  },
  [FeatureType.FORKLIFT_MANAGEMENT]: {
    feature: FeatureType.FORKLIFT_MANAGEMENT,
    s3Path: 'forklift-management',
    dbField: 'forklift_management',
    legacyNames: [],
    description: 'Forklift management attachments',
  },
  [FeatureType.FORKLIFT_MAINTENANCE_SERVICE]: {
    feature: FeatureType.FORKLIFT_MAINTENANCE_SERVICE,
    s3Path: 'forklift-maintenance-service',
    dbField: 'forklift_maintenance_service',
    legacyNames: [],
    description: 'Forklift maintenance service attachments',
  },
  [FeatureType.CHECKLIST]: {
    feature: FeatureType.CHECKLIST,
    s3Path: 'checklist',
    dbField: 'checklist',
    legacyNames: ['CheckList'],
    description: 'Checklist attachments (22,225 records)',
  },
  // STATUS: LOCKED - Permit checklist mapping finalized and aligned.
  [FeatureType.PERMIT_CHECKLIST]: {
    feature: FeatureType.PERMIT_CHECKLIST,
    s3Path: 'permit-checklist',
    dbField: 'permit_checklist',
    legacyNames: ['permit_checklist'],
    description: 'Permit checklist attachments',
  },
  [FeatureType.CHECKLIST_INSTANCE]: {
    feature: FeatureType.CHECKLIST_INSTANCE,
    s3Path: 'checklist-instance',
    dbField: 'checklist_instance',
    legacyNames: ['CheckList'],
    description: 'Checklist instance attachments (uses CheckList legacy field)',
  },
  [FeatureType.CHECKLIST_MANAGE]: {
    feature: FeatureType.CHECKLIST_MANAGE,
    s3Path: 'checklist-manage',
    dbField: 'checklist_manage',
    legacyNames: ['CheckList'],
    description: 'Checklist management attachments (uses CheckList legacy field)',
  },
  // STATUS: LOCKED - Graphics BOM mapping finalized and aligned.
  [FeatureType.GRAPHICS_BOM]: {
    feature: FeatureType.GRAPHICS_BOM,
    s3Path: 'graphics-bom',
    dbField: 'graphics_bom',
    legacyNames: ['graphics_bom'],
    description: 'Graphics BOM attachments',
  },
  [FeatureType.INSPECTIONS_VEHICLE]: {
    feature: FeatureType.INSPECTIONS_VEHICLE,
    s3Path: 'vehicle-inspection',
    dbField: 'vehicle_inspection',
    legacyNames: ['Incoming Inspections', 'Vehicle Inspection'],
    description: 'Vehicle inspection attachments',
  },
  [FeatureType.INSPECTIONS_FORKLIFT]: {
    feature: FeatureType.INSPECTIONS_FORKLIFT,
    s3Path: 'forklift-inspection',
    dbField: 'forklift_inspection',
    legacyNames: ['forklift_inspection'],
    description: 'Forklift inspection attachments',
  },
  // STATUS: LOCKED - RMA mapping finalized and aligned.
  [FeatureType.RMA]: {
    feature: FeatureType.RMA,
    s3Path: 'rma',
    dbField: 'rma',
    legacyNames: ['RMA'],
    description: 'RMA attachments',
  },
  // STATUS: LOCKED - Receiving mapping finalized and aligned.
  [FeatureType.RECEIVING]: {
    feature: FeatureType.RECEIVING,
    s3Path: 'receiving',
    dbField: 'receiving',
    legacyNames: ['receiving', 'LOGISTICS_CALENDAR'],
    description: 'Receiving attachments',
  },
  // STATUS: LOCKED - Resources mapping finalized and aligned.
  [FeatureType.RESOURCES]: {
    feature: FeatureType.RESOURCES,
    s3Path: 'resources',
    dbField: 'resources',
    legacyNames: ['resources'],
    description: 'Resource attachments',
  },
  // STATUS: LOCKED - Safety incident legacy naming finalized.
  [FeatureType.SAFETY_INCIDENT]: {
    feature: FeatureType.SAFETY_INCIDENT,
    s3Path: 'safety-incident',
    dbField: 'safety_incident',
    legacyNames: ['Safety Incident'],
    description: 'Safety incident attachments (113 records)',
  },
  // STATUS: LOCKED - Shipping checklist mapping finalized and aligned.
  [FeatureType.SHIPPING_CHECKLIST]: {
    feature: FeatureType.SHIPPING_CHECKLIST,
    s3Path: 'shipping-checklist',
    dbField: 'shipping_checklist',
    legacyNames: ['shipping_checklist'],
    description: 'Shipping checklist attachments',
  },
  // STATUS: LOCKED - Shipping request mapping finalized and aligned.
  [FeatureType.SHIPPING_REQUEST]: {
    feature: FeatureType.SHIPPING_REQUEST,
    s3Path: 'shipping-request',
    dbField: 'shipping_request',
    legacyNames: ['Shipping Request'],
    description: 'Shipping request attachments (18 records)',
  },
};

/**
 * Get feature configuration by feature type
 */
export function getFeatureConfig(feature: FeatureType): FeatureAttachmentConfig {
  const config = FEATURE_ATTACHMENT_CONFIG[feature];
  if (!config) {
    throw new Error(`Unknown feature type: ${feature}`);
  }
  return config;
}
