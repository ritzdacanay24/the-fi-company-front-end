import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEyeFiSerialDto } from './create-eyefi-serial.dto';

export class BulkCreateEyeFiSerialDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEyeFiSerialDto)
  serialNumbers!: CreateEyeFiSerialDto[];
}
