import { IsNotEmpty, IsString } from 'class-validator';

export class VoidAssignmentDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  performed_by!: string;
}
