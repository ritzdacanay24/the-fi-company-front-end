export interface BulkCreateSgAssetItemDto {
  poNumber?: string;
  property_site?: string;
  sgPartNumber?: string;
  serialNumber?: string;
  category?: string;
  ul_category?: string;
  sgAssetNumber?: string;
  generated_SG_asset?: string;
  manualUpdate?: string | boolean | null;
  eyefi_serial_id?: number;
  ul_label_id?: number;
  ulNumber?: string;
  partNumber?: string;
  wo_number?: string;
  wo_part?: string;
  wo_description?: string;
  wo_qty_ord?: number;
  wo_due_date?: string;
  wo_routing?: string;
  wo_line?: string;
  cp_cust_part?: string;
  cp_cust?: string;
  inspector_name?: string;
  consumed_by?: string;
}

export interface BulkCreateSgAssetDto {
  user_full_name?: string;
  assignments?: BulkCreateSgAssetItemDto[];
}
