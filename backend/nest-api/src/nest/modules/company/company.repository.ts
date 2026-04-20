import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class CompanyRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'company_name',
    'phone_number',
    'website_url',
    'email_address',
    'address_1',
    'address_2',
    'city',
    'state',
    'zip_code',
    'country',
    'timezone',
    'date_format',
    'time_format',
    'first_day_of_week',
    'active',
    'business_hours',
    'tax_id_name',
    'tax_id_number',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_company', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(selectedViewType?: string): Promise<RowDataPacket[]> {
    if (selectedViewType === 'Active') {
      return this.rawQuery<RowDataPacket>(
        `SELECT * FROM eyefidb.fs_company WHERE active = 1`,
      );
    }

    if (selectedViewType === 'Inactive') {
      return this.rawQuery<RowDataPacket>(
        `SELECT * FROM eyefidb.fs_company WHERE active = 0 OR active IS NULL`,
      );
    }

    return this.find();
  }
}
