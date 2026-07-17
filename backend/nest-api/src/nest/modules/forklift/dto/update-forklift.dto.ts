import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateForkliftDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  forklift_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  unit_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  serial_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  fuel_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  year?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  created_by?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  active?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  include_in_inspection_report?: number;

  @IsOptional()
  @IsString()
  created_date?: string;
}
