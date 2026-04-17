import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class OrgChartRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getOrgChart(filters: Record<string, string>): Promise<RowDataPacket[]> {
    let sql = 'SELECT * FROM db.users';
    const params: string[] = [];
    const clauses: string[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (!this.isSafeColumnName(key) || value == null || value === '') {
        return;
      }
      clauses.push(`\`${key}\` = ?`);
      params.push(String(value));
    });

    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  async hasSubordinates(id: string): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM db.users
      WHERE parentId = ?
        AND active = 1
        AND isEmployee = 1
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [id]);
  }

  private isSafeColumnName(column: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(column);
  }
}
