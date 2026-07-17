import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComputerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  computer_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  asset_tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  computer_name?: string;

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
  @MaxLength(120)
  assigned_to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  operating_system?: string;

  @Type(() => Number)
  @IsInt()
  created_by!: number;

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
