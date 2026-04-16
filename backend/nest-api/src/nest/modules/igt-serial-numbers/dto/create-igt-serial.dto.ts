export class CreateIgtSerialDto {
  serial_number!: string;
  category?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  is_active?: number;
  created_by?: string;
}
