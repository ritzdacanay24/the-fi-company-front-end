import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePublicRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customer_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  onsite_customer_name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  onsite_customer_phone_number?: string;

  @IsEmail()
  email!: string;

  @IsArray()
  @IsOptional()
  cc_email?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  service_type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;
}
