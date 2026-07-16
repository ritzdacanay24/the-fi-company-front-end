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
  [FeatureType.PROJECT_MANAGER]: {
    feature: FeatureType.PROJECT_MANAGER,
    s3Path: 'project-manager',
    dbField: 'project_manager',
    legacyNames: ['project_manager', 'Project Manager'],
    description: 'Project manager attachments',
  },
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
  [FeatureType.FIELD_SERVICE_REQUEST]: {
    feature: FeatureType.FIELD_SERVICE_REQUEST,
    s3Path: 'field-service-request',
    dbField: 'field_service_request',
    legacyNames: ['Field Service Request'],
    description: 'Field service request attachments',
  },
  [FeatureType.FIELD_SERVICE_TRIP_DETAILS]: {
    feature: FeatureType.FIELD_SERVICE_TRIP_DETAILS,
    s3Path: 'field-service-trip-details',
    dbField: 'field_service_trip_details',
    legacyNames: ['Field Service Trip Details'],
    description: 'Field service trip details attachments',
  },
  [FeatureType.PARTS_REQUEST]: {
    feature: FeatureType.PARTS_REQUEST,
    s3Path: 'parts-request',
    dbField: 'parts_order',
    legacyNames: ['FS Parts Order'],
    description: 'Parts request attachments (239 records)',
  },
  [FeatureType.VEHICLE_MANAGEMENT]: {
    feature: FeatureType.VEHICLE_MANAGEMENT,
    s3Path: 'vehicle-management',
    dbField: 'vehicle_management',
    legacyNames: ['Vehicle Management', 'Vehicle Information'],
    description: 'Vehicle attachments',
  },
  [FeatureType.CHECKLIST]: {
    feature: FeatureType.CHECKLIST,
    s3Path: 'checklist',
    dbField: 'checklist',
    legacyNames: ['CheckList'],
    description: 'Checklist attachments (22,225 records)',
  },
  [FeatureType.PERMIT_CHECKLIST]: {
    feature: FeatureType.PERMIT_CHECKLIST,
    s3Path: 'permit-checklist',
    dbField: 'permit_checklist',
    legacyNames: ['permit_checklist', 'checklist', 'CheckList'],
    description: 'Permit checklist attachments',
  },
  [FeatureType.CHECKLIST_INSTANCE]: {
    feature: FeatureType.CHECKLIST_INSTANCE,
    s3Path: 'checklist/instance',
    dbField: 'checklist_instance',
    legacyNames: ['CheckList'],
    description: 'Checklist instance attachments (uses CheckList legacy field)',
  },
  [FeatureType.CHECKLIST_LEGACY]: {
    feature: FeatureType.CHECKLIST_LEGACY,
    s3Path: 'checklist/legacy-migration',
    dbField: 'checklist_legacy',
    legacyNames: ['CheckList'],
    description: 'Checklist legacy migration attachments (uses CheckList legacy field)',
  },
  [FeatureType.CHECKLIST_MANAGE]: {
    feature: FeatureType.CHECKLIST_MANAGE,
    s3Path: 'checklist/manage',
    dbField: 'checklist_manage',
    legacyNames: ['CheckList'],
    description: 'Checklist management attachments (uses CheckList legacy field)',
  },
  [FeatureType.GRAPHICS_BOM]: {
    feature: FeatureType.GRAPHICS_BOM,
    s3Path: 'graphics-bom',
    dbField: 'graphics_bom',
    legacyNames: ['graphics_bom'],
    description: 'Graphics BOM attachments',
  },
  [FeatureType.INSPECTIONS]: {
    feature: FeatureType.INSPECTIONS,
    s3Path: 'inspections',
    dbField: 'incoming_inspections',
    legacyNames: ['Incoming Inspections'],
    description: 'Inspection attachments (4,835 records)',
  },
  [FeatureType.INSPECTIONS_VEHICLE]: {
    feature: FeatureType.INSPECTIONS_VEHICLE,
    s3Path: 'inspections/vehicle',
    dbField: 'vehicle_inspection',
    legacyNames: ['Incoming Inspections', 'Vehicle Inspection'],
    description: 'Vehicle inspection attachments',
  },
  [FeatureType.INSPECTIONS_FORKLIFT]: {
    feature: FeatureType.INSPECTIONS_FORKLIFT,
    s3Path: 'inspections/forklift',
    dbField: 'forklift_inspection',
    legacyNames: ['forklift_inspection'],
    description: 'Forklift inspection attachments',
  },
  [FeatureType.LEGACY_MIGRATION]: {
    feature: FeatureType.LEGACY_MIGRATION,
    s3Path: 'legacy-migration',
    dbField: 'legacy_migration',
    legacyNames: ['legacy_migration'],
    description: 'Legacy migration attachments',
  },
  [FeatureType.RMA]: {
    feature: FeatureType.RMA,
    s3Path: 'rma',
    dbField: 'rma',
    legacyNames: ['RMA'],
    description: 'RMA attachments',
  },
  [FeatureType.RECEIVING]: {
    feature: FeatureType.RECEIVING,
    s3Path: 'receiving',
    dbField: 'receiving',
    legacyNames: ['receiving'],
    description: 'Receiving attachments',
  },
  [FeatureType.RESOURCES]: {
    feature: FeatureType.RESOURCES,
    s3Path: 'resources',
    dbField: 'resources',
    legacyNames: ['resources'],
    description: 'Resource attachments',
  },
  [FeatureType.SAFETY_INCIDENT]: {
    feature: FeatureType.SAFETY_INCIDENT,
    s3Path: 'safety-incident',
    dbField: 'safety_incident',
    legacyNames: ['safety-incident'],
    description: 'Safety incident attachments (113 records)',
  },
  [FeatureType.SHIPPING_CHECKLIST]: {
    feature: FeatureType.SHIPPING_CHECKLIST,
    s3Path: 'inspections/shipping',
    dbField: 'shippingChecklistItem',
    legacyNames: ['shippingChecklistItem'],
    description: 'Shipping checklist attachments',
  },
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
