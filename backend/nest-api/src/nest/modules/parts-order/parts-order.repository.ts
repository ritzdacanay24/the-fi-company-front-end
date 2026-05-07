import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class PartsOrderRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'oem',
    'casino_name',
    'arrival_date',
    'ship_via_account',
    'address',
    'contact_name',
    'contact_phone_number',
    'contact_email',
    'billable',
    'part_number',
    'part_qty',
    'instructions',
    'created_by',
    'created_date',
    'so_number',
    'tracking_number',
    'tracking_number_carrier',
    'return_tracking_number_carrier',
    'return_tracking_number',
    'serial_number',
    'details',
    'active',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_parts_order', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getBySoLineNumber(soNumber: string): Promise<RowDataPacket | null> {
    return this.findOne({ so_number: soNumber });
  }

  async findAllWithUser(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(`
      SELECT a.*, CONCAT(b.first, ' ', b.last) AS created_by_name
      FROM eyefidb.fs_parts_order a
      LEFT JOIN db.users b ON b.id = a.created_by
      ORDER BY a.id DESC
    `);
  }
}
