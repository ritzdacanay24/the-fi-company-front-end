import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePublicRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customer_name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  onsite_customer_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  onsite_customer_phone_number?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsArray()
  @IsOptional()
  cc_email?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  service_type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;
}
