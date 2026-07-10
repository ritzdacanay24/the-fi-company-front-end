/**
 * Feature types for attachment uploads
 * Used to route attachments to the correct database tables and S3 prefixes
 * Maps to actual S3 bucket folder structure
 */
export enum FeatureType {
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

/**
 * Feature configuration mapping
 * Uses standardized snake_case names for new uploads
 * Maintains backward compatibility by mapping to legacy field names in database
 * Legacy names are automatically queried when retrieving existing records
 */
export const FEATURE_CONFIG: Record<FeatureType, { s3Prefix: string; field: string; legacyNames?: string[] }> = {
  [FeatureType.NCR]: {
    s3Prefix: 'ncr/{id}',
    field: 'ncr',
    legacyNames: ['NCR'],
  },
  [FeatureType.QIR]: {
    s3Prefix: 'qir/{id}',
    field: 'capa_request',
    legacyNames: ['Capa Request'],
  },
  [FeatureType.SUPPORT_TICKETS]: {
    s3Prefix: 'support-tickets/{id}',
    field: 'support_ticket',
    legacyNames: ['support_ticket'],
  },
  [FeatureType.FIELD_SERVICE_REQUEST]: {
    s3Prefix: 'field-service-request/{id}',
    field: 'field_service_request',
    legacyNames: ['Field Service Request'],
  },
  [FeatureType.FIELD_SERVICE_TRIP_DETAILS]: {
    s3Prefix: 'field-service-trip-details/{id}',
    field: 'field_service_trip_details',
    legacyNames: ['Field Service Trip Details'],
  },
  [FeatureType.PARTS_REQUEST]: {
    s3Prefix: 'parts-request/{id}',
    field: 'parts_order',
    legacyNames: ['FS Parts Order'],
  },
  [FeatureType.VEHICLE]: {
    s3Prefix: 'vehicle/{id}',
    field: 'vehicle_information',
    legacyNames: ['Vehicle Information'],
  },
  [FeatureType.CHECKLIST]: {
    s3Prefix: 'checklist/{id}',
    field: 'checklist',
    legacyNames: ['CheckList'],
  },
  [FeatureType.PERMIT_CHECKLIST]: {
    s3Prefix: 'permit-checklist/{id}',
    field: 'permit_checklist',
    legacyNames: ['permit_checklist', 'checklist', 'CheckList'],
  },
  [FeatureType.CHECKLIST_INSTANCE]: {
    s3Prefix: 'checklist/instance/{id}',
    field: 'checklist_instance',
    legacyNames: ['CheckList'],
  },
  [FeatureType.CHECKLIST_LEGACY]: {
    s3Prefix: 'checklist/legacy-migration/{id}',
    field: 'checklist_legacy',
    legacyNames: ['CheckList'],
  },
  [FeatureType.CHECKLIST_MANAGE]: {
    s3Prefix: 'checklist/manage/{id}',
    field: 'checklist_manage',
    legacyNames: ['CheckList'],
  },
  [FeatureType.GRAPHICS_BOM]: {
    s3Prefix: 'graphics-bom/{id}',
    field: 'graphics_bom',
    legacyNames: ['graphics_bom'],
  },
  [FeatureType.INSPECTIONS]: {
    s3Prefix: 'inspections/{id}',
    field: 'incoming_inspections',
    legacyNames: ['Incoming Inspections'],
  },
  [FeatureType.INSPECTIONS_VEHICLE]: {
    s3Prefix: 'inspections/vehicle/{id}',
    field: 'incoming_inspections',
    legacyNames: ['Incoming Inspections', 'Vehicle Inspection'],
  },
  [FeatureType.INSPECTIONS_FORKLIFT]: {
    s3Prefix: 'inspections/forklift/{id}',
    field: 'incoming_inspections',
    legacyNames: ['Incoming Inspections', 'Vehicle Inspection'],
  },
  [FeatureType.LEGACY_MIGRATION]: {
    s3Prefix: 'legacy-migration/{id}',
    field: 'legacy_migration',
    legacyNames: ['legacy_migration'],
  },
  [FeatureType.RMA]: {
    s3Prefix: 'rma/{id}',
    field: 'rma',
    legacyNames: ['RMA'],
  },
  [FeatureType.RECEIVING]: {
    s3Prefix: 'receiving/{id}',
    field: 'receiving',
    legacyNames: ['receiving'],
  },
  [FeatureType.RESOURCES]: {
    s3Prefix: 'resources/{id}',
    field: 'resources',
    legacyNames: ['resources'],
  },
  [FeatureType.SAFETY_INCIDENT]: {
    s3Prefix: 'safety-incident/{id}',
    field: 'safety_incident',
    legacyNames: ['Safety Incident'],
  },
  [FeatureType.SHIPPING_CHECKLIST]: {
    s3Prefix: 'inspections/shipping/{id}',
    field: 'shippingChecklistItem',
    legacyNames: ['shippingChecklistItem'],
  },
  [FeatureType.SHIPPING_REQUEST]: {
    s3Prefix: 'shipping-request/{id}',
    field: 'shipping_request',
    legacyNames: ['Shipping Request'],
  },
};
