import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

interface RequestChartRow extends RowDataPacket {
  sod_per_date: string;
  value: number;
  total_shipped_on_time: number;
  label: string;
  so_cust: string;
  total_lines: number;
}

@Injectable()
export class RequestRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'type_of_service',
    'date_of_service',
    'dateAndTime',
    'start_time',
    'so_number',
    'customer_co_number',
    'type_of_sign',
    'eyefi_customer_sign_part',
    'sign_theme',
    'onsite_customer_name',
    'onsite_customer_phone_number',
    'property',
    'lat',
    'lon',
    'address1',
    'address2',
    'state',
    'city',
    'zip',
    'licensing_required',
    'ceiling_height',
    'bolt_to_floor',
    'special_instruction',
    'created_date',
    'requested_by',
    'customer',
    'platform',
    'email',
    'token',
    'sign_jacks',
    'serial_number',
    'gRecaptchaResponse',
    'subject',
    'cc_email',
    'active',
    'cancellation_reason',
    'cancellation_notes',
    'canceled_by',
    'canceled_by_name',
    'canceled_at',
    'sign_manufacture',
    'customer_product_number',
    'site_survey_requested',
    'email_sent',
    'created_by',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_request', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getAllRequests(selectedViewType?: string): Promise<RowDataPacket[]> {
    let sql = `
      SELECT a.*,
             DATEDIFF(CURDATE(), a.created_date) AS total_days,
             b.id AS fs_scheduler_id
      FROM eyefidb.fs_request a
      LEFT JOIN eyefidb.fs_scheduler b ON b.request_id = a.id
    `;

    if (selectedViewType === 'Open') {
      sql += ' WHERE a.active = 1 AND b.id IS NULL';
    } else if (selectedViewType === 'Closed') {
      sql += ' WHERE a.active = 1 AND b.id IS NOT NULL';
    }

    sql += ' ORDER BY a.created_date DESC';
    return this.rawQuery<RowDataPacket>(sql);
  }

  async getSummary(dateFrom: string, dateTo: string): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `
        SELECT COUNT(*) AS value,
               SUM(CASE WHEN active = 0 OR active IS NULL THEN 1 ELSE 0 END) AS total_cancelled,
               customer AS label
        FROM eyefidb.fs_request
        WHERE DATE(created_date) BETWEEN ? AND ?
        GROUP BY customer
      `,
      [dateFrom, dateTo],
    );
  }

  async getChartRows(
    dateFrom: string,
    dateTo: string,
    displayCustomers: string,
  ): Promise<RequestChartRow[]> {
    const params: (string | number)[] = [dateFrom, dateTo];
    let sql = `
      SELECT DATE(created_date) AS sod_per_date,
             COUNT(*) AS value,
             SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS total_shipped_on_time,
             customer AS label,
             customer AS so_cust,
             0 AS total_lines
      FROM eyefidb.fs_request
      WHERE DATE(created_date) BETWEEN ? AND ?
    `;

    if (displayCustomers !== 'Show All') {
      sql += ' AND customer = ?';
      params.push(displayCustomers);
    }

    sql += ' GROUP BY DATE(created_date), customer';

    return this.rawQuery<RequestChartRow>(sql, params);
  }
}
