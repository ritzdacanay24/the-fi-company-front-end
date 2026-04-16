import { CreateIgtSerialDto } from './create-igt-serial.dto';

export class BulkUploadOptionsDto {
  serialNumbers!: { serial_number: string; category?: string }[];
  duplicateStrategy?: 'skip' | 'replace' | 'error';
  category?: string;
}

export class BulkCreateDto {
  serials?: Partial<CreateIgtSerialDto>[];
  // For IgtAssetService bulk assignment format
  assignments?: any[];
  user_full_name?: string;
}
