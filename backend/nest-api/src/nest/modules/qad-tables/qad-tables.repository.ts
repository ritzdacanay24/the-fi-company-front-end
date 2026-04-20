import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type QadTableNameRow = RowDataPacket & {
  id: number;
  description: string;
  tbl: string;
  status: number | boolean;
  noData: number | boolean;
};

type SavedQueryRow = RowDataPacket & {
  id: number;
  query: string;
  createdDate: string;
  createdBy: string | null;
};

@Injectable()
export class QadTablesRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getQadTableNames(): Promise<QadTableNameRow[]> {
    return this.mysqlService.query<QadTableNameRow[]>(
      `
        SELECT id,
               description,
               tbl,
               status,
               noData
        FROM db.qadTableNames
      `,
    );
  }

  async getSavedQueries(): Promise<SavedQueryRow[]> {
    return this.mysqlService.query<SavedQueryRow[]>(
      `
        SELECT a.id,
               a.query,
               a.createdDate,
               CONCAT(b.first, ' ', b.last) AS createdBy
        FROM db.queries a
        LEFT JOIN db.users b ON b.id = a.createdBy
        ORDER BY a.id DESC
      `,
    );
  }
}
