export interface CreateAgsSerialDto {
  timeStamp?: string;
  poNumber?: string;
  property_site?: string;
  sgPartNumber?: string;
  inspectorName?: string;
  generated_SG_asset?: string;
  serialNumber?: string;
  lastUpdate?: string;
  active?: number;
  manualUpdate?: string | boolean | null;
  created_by?: number;
}
