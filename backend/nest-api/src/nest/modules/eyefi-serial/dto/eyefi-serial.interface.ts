import { RowDataPacket } from 'mysql2/promise';

export interface EyeFiSerialRecord extends RowDataPacket {
  id: number;
  serial_number: string;
  product_model?: string;
  status?: string;
  is_consumed?: boolean;
  is_active?: boolean;
  hardware_version?: string;
  firmware_version?: string;
  manufacture_date?: string;
  batch_number?: string;
  qr_code?: string;
  notes?: string;
  created_by?: string | number | null;
  created_at?: string;
  updated_at?: string;
  assigned_at?: string;
  consumed_at?: string;
  consumed_by?: string | null;
}
