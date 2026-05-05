import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface ScheduledJobConfig extends RowDataPacket {
  id: string;
  cron: string;
  active: boolean;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ScheduledJobsConfigRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  async findById(id: string): Promise<ScheduledJobConfig | null> {
    const rows = await this.mysqlService.execute<ScheduledJobConfig[]>(
      'SELECT * FROM scheduled_jobs_config WHERE id = ?',
      [id]
    );
    return rows?.[0] || null;
  }

  async findAll(): Promise<ScheduledJobConfig[]> {
    const rows = await this.mysqlService.execute<ScheduledJobConfig[]>(
      'SELECT * FROM scheduled_jobs_config ORDER BY id'
    );
    return rows || [];
  }

  async upsert(config: {
    id: string;
    cron: string;
    active: boolean;
    note?: string;
  }): Promise<ScheduledJobConfig | null> {
    await this.mysqlService.execute(
      `INSERT INTO scheduled_jobs_config (id, cron, active, note)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         cron = VALUES(cron),
         active = VALUES(active),
         note = VALUES(note),
         updated_at = CURRENT_TIMESTAMP`,
      [config.id, config.cron, config.active, config.note || null]
    );

    return this.findById(config.id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'DELETE FROM scheduled_jobs_config WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async deleteAll(): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'DELETE FROM scheduled_jobs_config'
    );
    return result.affectedRows;
  }
}
