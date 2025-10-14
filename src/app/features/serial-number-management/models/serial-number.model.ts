export interface SerialNumber {
  id?: number;
  serial_number: string;
  product_model: string;
  hardware_version?: string;
  firmware_version?: string;
  manufacture_date?: string;
  batch_number?: string;
  status: 'available' | 'assigned' | 'shipped' | 'returned' | 'defective';
  qr_code?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  
  // Assignment tracking (populated by backend join queries)
  assigned_to_table?: string; // 'agsSerialGenerator' | 'ul_label_usages' | 'sgAssetGenerator'
  assigned_to_id?: number;
  assigned_by?: string;
  assigned_at?: string;
}

export interface SerialNumberAssignment {
  id?: number;
  serial_number_id: number;
  serial_number: string; // Denormalized for easier querying
  work_order_number?: string;
  customer_name?: string;
  customer_po?: string;
  assigned_date: string;
  shipped_date?: string;
  tracking_number?: string;
  assigned_by_user: string;
  assigned_by_name: string;
  notes?: string;
  // Work Order Information
  wo_nbr?: number;
  wo_due_date?: string;
  wo_part?: string;
  wo_qty_ord?: number;
  wo_routing?: string;
  wo_line?: string;
  wo_description?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface SerialNumberReport {
  serial_number: string;
  product_model: string;
  status: string;
  assigned_date?: string;
  customer_name?: string;
  work_order_number?: string;
}

export interface SerialNumberUsageReport {
  id: number;
  serial_number: string;
  product_model: string;
  customer_name: string;
  work_order_number: string;
  assigned_date: string;
  shipped_date?: string;
  assigned_by_name: string;
  notes: string;
  // Work Order Information
  wo_nbr?: number;
  wo_due_date?: string;
  wo_part?: string;
  wo_qty_ord?: number;
  wo_routing?: string;
  wo_line?: string;
  wo_description?: string;
}

export interface SerialNumberStats {
  total_serial_numbers: number;
  available_count: number;
  assigned_count: number;
  shipped_count: number;
  defective_count: number;
  by_product_model: { [key: string]: number };
  recent_assignments: SerialNumberAssignment[];
}

export interface SerialNumberBatch {
  batch_id: string;
  prefix: string;
  start_number: number;
  end_number: number;
  quantity: number;
  product_model: string;
  manufacture_date: string;
  created_by: string;
  created_at: string;
}