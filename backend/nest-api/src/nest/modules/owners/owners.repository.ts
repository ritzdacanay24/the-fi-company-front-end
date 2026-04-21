import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class OwnersRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  /**
   * Get active owners with production status
   */
  async getActiveWithProductionStatus(): Promise<GenericRow[]> {
    const sql = `
      SELECT name, is_production
      FROM eyefidb.owners
      WHERE is_active = 1
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql);
  }
}
