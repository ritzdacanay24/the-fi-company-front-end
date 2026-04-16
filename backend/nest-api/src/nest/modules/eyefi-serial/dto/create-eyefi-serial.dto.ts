import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateEyeFiSerialDto {
  @IsNotEmpty()
  @IsString()
  serial_number!: string;

  @IsOptional()
  @IsString()
  product_model?: string;

  @IsOptional()
  @IsString()
  @IsIn(['available', 'assigned', 'shipped', 'returned', 'defective'])
  status?: string;

  @IsOptional()
  @IsString()
  hardware_version?: string;

  @IsOptional()
  @IsString()
  firmware_version?: string;

  @IsOptional()
  @IsDateString()
  manufacture_date?: string;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsString()
  qr_code?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  created_by?: string;
}
