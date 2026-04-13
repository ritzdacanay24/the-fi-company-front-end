import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSafetyIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  type_of_incident?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location_of_incident?: string;

  @IsOptional()
  @IsDateString()
  created_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location_of_incident_other?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_of_incident?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  created_by?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  corrective_action_owner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  type_of_incident_other?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  proposed_corrective_action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  proposed_corrective_action_completion_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  confirmed_corrective_action_completion_date?: string;

  @IsOptional()
  @IsDateString()
  date_of_incident?: string;

  @IsOptional()
  @IsString()
  time_of_incident?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location_of_incident_other_other?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  corrective_action_owner_user_id?: number;

  @IsOptional()
  @IsString()
  corrective_action_owner_user_email?: string;

  @IsOptional()
  @IsString()
  details_of_any_damage_or_personal_injury?: string;
}
