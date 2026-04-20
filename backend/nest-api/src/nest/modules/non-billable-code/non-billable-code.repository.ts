import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface NonBillableCodeRecord extends RowDataPacket {
  id: number;
  active: number | null;
}

@Injectable()
export class NonBillableCodeRepository extends BaseRepository<NonBillableCodeRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_non_billable_code', mysqlService);
  }

  async getAllByViewType(selectedViewType?: string): Promise<NonBillableCodeRecord[]> {
    if (selectedViewType === 'Active') {
      return this.rawQuery<NonBillableCodeRecord>(
        `SELECT * FROM eyefidb.fs_non_billable_code WHERE active = 1 ORDER BY id DESC`,
      );
    }

    if (selectedViewType === 'Inactive') {
      return this.rawQuery<NonBillableCodeRecord>(
        `SELECT * FROM eyefidb.fs_non_billable_code WHERE active = 0 OR active IS NULL ORDER BY id DESC`,
      );
    }

    return this.find();
  }
}
