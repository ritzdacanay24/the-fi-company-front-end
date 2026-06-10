import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BulkVoidDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids!: number[];

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  performed_by!: string;
}
