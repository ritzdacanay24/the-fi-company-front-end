import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateIgtSerialDto } from './create-igt-serial.dto';

class BulkUploadSerialItemDto {
  @IsString()
  serial_number!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class BulkUploadOptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUploadSerialItemDto)
  serialNumbers!: BulkUploadSerialItemDto[];

  @IsOptional()
  @IsIn(['skip', 'replace', 'error'])
  duplicateStrategy?: 'skip' | 'replace' | 'error';

  @IsOptional()
  @IsString()
  category?: string;
}

export class BulkCreateDto {
  serials?: Partial<CreateIgtSerialDto>[];
  // For IgtAssetService bulk assignment format
  assignments?: any[];
  user_full_name?: string;
}
