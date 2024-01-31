//https://netbasal.com/typed-reactive-forms-in-angular-no-longer-a-type-dream-bf6982b0af28
export interface IPlacardForm {
  line_number: number;
  customer_name: string;
  eyefi_wo_number: string;
  po_number: string;
  eyefi_so_number: string;
  customer_co_por_so: string;
  description: string;
  eyefi_part_number: string;
  customer_part_number: string;
  location: string;
  customer_serial_tag: string;
  eyefi_serial_tag: string;
  qty: number;
  label_count: number;
  total_label_count: number;
  created_date?: string
  created_by?: number
  active: number
}
