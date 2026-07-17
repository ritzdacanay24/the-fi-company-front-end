import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVehicleMaintenanceDto {
  @Type(() => Number)
  @IsInt()
  vehicle_id!: number;

  @IsString()
  @MaxLength(25)
  service_date!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mileage?: number;

  @IsString()
  @MaxLength(255)
  service_type!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  cost?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  work_order_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  next_service_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  next_service_mileage?: number | null;

  @Type(() => Number)
  @IsInt()
  created_by!: number;
}
