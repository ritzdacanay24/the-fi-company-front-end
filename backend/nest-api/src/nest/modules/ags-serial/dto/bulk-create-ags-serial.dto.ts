export interface BulkCreateAgsSerialItemDto {
  poNumber?: string;
  property_site?: string;
  sgPartNumber?: string;
  serialNumber?: string;
  generated_SG_asset?: string;
  manualUpdate?: string | boolean | null;
  eyefi_serial_id?: number;
  inspector_name?: string;
  consumed_by?: string;
}

export interface BulkCreateAgsSerialDto {
  user_full_name?: string;
  assignments?: BulkCreateAgsSerialItemDto[];
}
