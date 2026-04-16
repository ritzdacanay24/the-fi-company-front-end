import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_po?: string;

  @IsOptional()
  @IsString()
  work_order_number?: string;

  @IsOptional()
  @IsString()
  wo_part?: string;

  @IsOptional()
  wo_qty_ord?: number;

  @IsOptional()
  @IsDateString()
  wo_due_date?: string;

  @IsOptional()
  @IsString()
  wo_description?: string;

  @IsOptional()
  @IsDateString()
  assigned_date?: string;

  @IsOptional()
  @IsString()
  assigned_by_name?: string;

  @IsOptional()
  @IsDateString()
  shipped_date?: string;

  @IsOptional()
  @IsString()
  tracking_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
