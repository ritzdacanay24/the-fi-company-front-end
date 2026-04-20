import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface StatusCategoryRecord extends RowDataPacket {
  id: number;
  title: string | null;
  active: number | null;
}

@Injectable()
export class StatusCategoryRepository extends BaseRepository<StatusCategoryRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_status_category', mysqlService);
  }
}
