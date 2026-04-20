import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

interface TeamPayload {
  user?: string;
  user_rate?: string | number | null;
  lead_tech?: string | number | boolean | null;
  contractor_code?: string | null;
  user_id?: string | number | null;
}

@Injectable()
export class JobRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedSchedulerColumns = new Set([
    'request_id',
    'created_by',
    'group_id',
    'connecting_jobs',
    'turnover_fsid',
    'request_date',
    'start_time',
    'requested_by',
    'status',
    'sales_order_number',
    'service_type',
    'customer',
    'out_of_state',
    'sign_theme',
    'sign_type',
    'platform',
    'comments',
    'notes',
    'vendor_cost',
    'invoice',
    'invoice_date',
    'invoice_number',
    'invoice_notes',
    'vendor_inv_number',
    'billable_flat_rate_or_po',
    'paper_work_location',
    'acc_status',
    'contractor_inv_sent_to_ap',
    'period',
    'billable',
    'active',
    'co_number',
    'customer_cancelled',
    'cancellation_comments',
    'cancelled_type',
    'mark_up_percent',
    'ef_hourly_rate',
    'ef_overtime_hourly_rate',
    'compliance_license_notes',
    'published',
    'property_id',
    'queue',
    'queus_status',
    'title',
    'schedule_later',
    'non_billable_code',
    'property',
    'fs_lat',
    'fs_lon',
    'address1',
    'address2',
    'city',
    'state',
    'zip_code',
    'country',
    'property_phone',
    'sign_responsibility',
    'fs_calendar_id',
    'onsite_customer_name',
    'onsite_customer_phone_number',
    'licensing_required',
    'ceiling_height',
    'bolt_to_floor',
    'sign_jacks',
    'site_survey_requested',
    'per_tech_rate',
    'per_tech_rate_ot',
    'original_request_date',
    'notice_email_date',
  ]);

  constructor(@Inject(MysqlService) private readonly mysqlServiceRef: MysqlService) {
    super('eyefidb.fs_scheduler', mysqlServiceRef);
  }

  sanitizeSchedulerPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedSchedulerColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(
    dateFrom?: string,
    dateTo?: string,
    selectedViewType?: string,
    isAll = false,
  ): Promise<RowDataPacket[]> {
    const params: (string | number)[] = [];

    let sql = 'SELECT a.* FROM eyefidb.fs_scheduler_view a WHERE a.id != 0';

    if (!isAll && dateFrom && dateTo && dateFrom !== 'null' && dateTo !== 'null') {
      sql += ' AND a.request_date BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }

    if (selectedViewType === 'Open') {
      sql += " AND a.status IN ('Pending', 'Confirmed') AND a.active = 1";
    } else if (selectedViewType === 'Completed') {
      sql += " AND a.status IN ('Completed')";
    }

    sql += ' ORDER BY a.request_date DESC, a.start_time DESC';

    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async getOpenInvoice(dateFrom?: string, dateTo?: string, isAll = false): Promise<RowDataPacket[]> {
    const params: (string | number)[] = [];

    let sql = `
      SELECT a.status,
             a.invoice_date,
             a.id,
             a.request_date,
             b.id AS ticket_started,
             b.dateSubmitted,
             b.review_status
      FROM eyefidb.fs_scheduler a
      JOIN eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id AND b.active = 1 AND b.dateSubmitted IS NOT NULL
      WHERE a.acc_status IS NULL
        AND a.active = 1
        AND a.status IN ('Pending', 'Confirmed', 'Completed')
    `;

    if (!isAll && dateFrom && dateTo && dateFrom !== 'null' && dateTo !== 'null') {
      sql += ' AND a.request_date BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }

    sql += ' ORDER BY a.request_date DESC';

    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async createJob(payload: Record<string, unknown>, resource: TeamPayload[] = []): Promise<number> {
    return this.mysqlServiceRef.withTransaction(async (connection: PoolConnection) => {
      const keys = Object.keys(payload);
      const values = Object.values(payload);

      if (!keys.length) {
        throw new Error('Job payload is empty');
      }

      const placeholders = keys.map(() => '?').join(', ');
      const columns = keys.join(', ');
      const insertSql = `INSERT INTO eyefidb.fs_scheduler (${columns}) VALUES (${placeholders})`;

      const [result] = await connection.query(insertSql, values as any[]);
      const insertId = (result as ResultSetHeader).insertId;

      await this.replaceTeamMembers(connection, insertId, resource);

      return insertId;
    });
  }

  async updateJob(id: number, payload: Record<string, unknown>, resource: TeamPayload[] = []): Promise<number> {
    return this.mysqlServiceRef.withTransaction(async (connection: PoolConnection) => {
      const keys = Object.keys(payload);
      const values = Object.values(payload);

      if (keys.length) {
        const setClause = keys.map((key) => `${key} = ?`).join(', ');
        const updateSql = `UPDATE eyefidb.fs_scheduler SET ${setClause} WHERE id = ?`;
        await connection.query(updateSql, [...values, id] as any[]);
      }

      await connection.execute<ResultSetHeader>('DELETE FROM eyefidb.fs_team WHERE fs_det_id = ?', [id]);
      await this.replaceTeamMembers(connection, id, resource);

      return id;
    });
  }

  private async replaceTeamMembers(connection: PoolConnection, fsDetId: number, resource: TeamPayload[]) {
    if (!Array.isArray(resource) || !resource.length) {
      return;
    }

    for (const row of resource) {
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO eyefidb.fs_team
            (fs_det_id, user, user_rate, active, lead_tech, contractor_code, user_id)
          VALUES
            (?, ?, ?, 1, ?, ?, ?)
        `,
        [
          fsDetId,
          row.user ?? null,
          row.user_rate ?? null,
          row.lead_tech ?? 0,
          row.contractor_code ?? null,
          row.user_id ?? null,
        ],
      );
    }
  }
}
