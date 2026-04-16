import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  serial_number!: string;

  @IsNotEmpty()
  @IsString()
  customer_name!: string;

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

  @IsNotEmpty()
  @IsDateString()
  assigned_date!: string;

  @IsNotEmpty()
  @IsString()
  assigned_by_name!: string;

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
