export interface ULLabel {
  id?: number;
  ul_number: string;
  description: string;
  category: string;
  manufacturer?: string;
  part_number?: string;
  certification_date?: string;
  expiry_date?: string;
  label_image_url?: string;
  status: 'active' | 'inactive' | 'expired';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface ULLabelUsage {
  id?: number;
  ul_label_id: number;
  ul_number: string; // Denormalized for easier querying
  eyefi_serial_number: string;
  quantity_used: number;
  date_used: string;
  user_signature: string;
  user_name: string;
  customer_name: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface ULLabelReport {
  ul_number: string;
  description: string;
  total_quantity_used: number;
  last_used_date: string;
  usage_count: number;
  status: string;
}

export interface ULUsageReport {
  id: number;
  ul_number: string;
  description: string;
  eyefi_serial_number: string;
  quantity_used: number;
  date_used: string;
  user_name: string;
  customer_name: string;
  notes: string;
}
