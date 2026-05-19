import { IsBoolean, IsDateString, IsEmail, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const normalizeTextValue = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return value;
};

export class CreateSafetyIncidentDto {
  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(200)
  first_name?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(200)
  last_name?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(200)
  type_of_incident?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(200)
  location_of_incident?: string;

  @IsOptional()
  @IsDateString()
  created_date?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(300)
  location_of_incident_other?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(2000)
  description_of_incident?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  created_by?: number;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(300)
  corrective_action_owner?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(300)
  type_of_incident_other?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(2000)
  proposed_corrective_action?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(300)
  proposed_corrective_action_completion_date?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(100)
  confirmed_corrective_action_completion_date?: string;

  @IsOptional()
  @IsDateString()
  date_of_incident?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  time_of_incident?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(300)
  location_of_incident_other_other?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  corrective_action_owner_user_id?: number;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  corrective_action_owner_user_email?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  details_of_any_damage_or_personal_injury?: string;

  // Public form compatibility fields (accepted and normalized, then ignored if not persisted)
  @IsOptional()
  @Transform(normalizeTextValue)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  })
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(300)
  location_of_incident_las_vegas_facility?: string;

  @IsOptional()
  @Transform(normalizeTextValue)
  @IsString()
  @MaxLength(2000)
  immediate_action_taken?: string;
}
