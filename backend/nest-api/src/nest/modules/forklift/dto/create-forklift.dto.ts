import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateForkliftDto {
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

  @Type(() => Number)
  @IsInt()
  created_by!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  active?: number;

  @IsOptional()
  @IsString()
  created_date?: string;
}
