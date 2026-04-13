import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(25)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  year?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  vin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  exp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  vehicleNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mileage?: number;

  @IsOptional()
  @IsString()
  lastServiceDate?: string;

  @IsOptional()
  @IsString()
  typeOfService?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  fuelType?: string;

  @Type(() => Number)
  @IsInt()
  createdBy!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  active?: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  licensePlate?: string;

  @IsOptional()
  @IsString()
  createdDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  inMaintenance?: number;
}
