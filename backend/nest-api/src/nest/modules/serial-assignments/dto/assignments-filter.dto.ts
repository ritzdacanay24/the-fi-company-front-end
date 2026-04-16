import { IsOptional, IsString, IsBoolean, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignmentsFilterDto {
  @IsOptional()
  @IsString()
  wo_number?: string;

  @IsOptional()
  @IsString()
  eyefi_serial_number?: string;

  @IsOptional()
  @IsString()
  ul_number?: string;

  @IsOptional()
  @IsString()
  consumed_by?: string;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_voided?: boolean;

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;
}
