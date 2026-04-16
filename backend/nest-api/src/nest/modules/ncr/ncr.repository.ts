import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { MysqlService } from '@/shared/database/mysql.service';

interface NcrSummaryRow extends RowDataPacket {
  department: string;
  total_ncrs: number;
  total_open: number;
  total_open_corrective_action: number;
  ca_submitted_on_time: number;
  ca_submitted_late: number;
  total_open_verification: number;
  ca_open_past_due: number;
  on_time_percentage: number;
}

interface NcrChartRow extends RowDataPacket {
  total: number;
  on_time: number;
}

interface NotificationRecipientRow extends RowDataPacket {
  email: string;
}

interface NcrComplaintCodeRow extends RowDataPacket {
  id: number;
  name: string;
}

@Injectable()
export class NcrRepository {
  private static readonly NCR_MUTABLE_COLUMNS = [
    'source',
    'po_nbr',
    'wo_nbr',
    'ncr_nbr',
    'ncr_type',
    'pt_nbr',
    'rev',
    'initiated_by',
    'ret_nbr',
    'acc',
    'rej',
    'sample_size',
    'dept_operator',
    'finished_nbr',
    'desc_of_defn_rej',
    'cont_notes',
    'cont_type',
    'cont_dspn_by',
    'cont_dspn_title',
    'cont_dspn_dt',
    'dspn_desc',
    'impact_assesment',
    'icm_notes',
    'icm_dspn_by',
    'icm_dspn_title',
    'icm_dspn_dt',
    'ca_action_req',
    'iss_by',
    'iss_dt',
    'ca_iss_to',
    'ca_due_dt',
    'ca_cont_immed_action_taken',
    'ca_root_cause',
    'ca_taken_to_prevent_recurr',
    'planned_ca_impl_dt',
    'ca_by',
    'ca_title',
    'ca_dt',
    'ca_impl_by',
    'ca_impl_title',
    'ca_impl_dt',
    'ca_submitted_date',
    'verif_of_ca_by',
    'verif_of_ca_dt',
    'eff_verif_of_ca_by',
    'eff_verif_of_ca_dt',
    'cmt_cls_by',
    'cmt_cls_dt',
    'submitted_date',
    'created_date',
    'created_by',
    'updated_by',
    'complaint_code',
    'qir_number',
    'active',
    'ca_email_sent_date_time',
    'ca_email_sent_by',
    'ca_email_sent_to',
  ] as const;

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll: boolean;
  }): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];

    let sql = `
      SELECT
        *,
        CASE WHEN ca_iss_to IS NULL OR TRIM(ca_iss_to) = '' THEN 'No Department Selected' ELSE ca_iss_to END AS ca_iss_to
      FROM ncr a
      WHERE 1 = 1
    `;

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ` AND a.created_date BETWEEN ? AND ?`;
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Open') {
      sql += ` AND a.active = 1 AND (a.submitted_date IS NULL OR TRIM(a.submitted_date) = '')`;
    } else if (params.selectedViewType === 'Closed') {
      sql += ` AND a.active = 1 AND (a.submitted_date IS NOT NULL AND TRIM(a.submitted_date) <> '')`;
    }

    sql += ` ORDER BY a.created_date DESC`;

    return this.mysqlService.query<RowDataPacket[]>(sql, queryParams);
  }

  async getOpenSummary(): Promise<{
    data: NcrSummaryRow[];
    totalOpen: number;
    totalOpenCA: number;
    totalOpenVerifiation: number;
    totalNCR: number;
    ca_open_past_due: number;
    otd: number;
  }> {
    const sql = `
      SELECT
        *,
        (ca_submitted_on_time / NULLIF(total_ncrs, 0)) * 100 AS on_time_percentage
      FROM (
        SELECT
          CASE WHEN ca_iss_to IS NULL OR TRIM(ca_iss_to) = '' THEN 'No Department Selected' ELSE ca_iss_to END AS department,
          COUNT(*) AS total_ncrs,
          SUM(CASE WHEN submitted_date IS NULL OR TRIM(submitted_date) = '' THEN 1 ELSE 0 END) AS total_open,
          SUM(CASE WHEN (ca_submitted_date IS NULL OR TRIM(ca_submitted_date) = '') AND (submitted_date IS NULL OR TRIM(submitted_date) = '') THEN 1 ELSE 0 END) AS total_open_corrective_action,
          SUM(CASE WHEN DATE(ca_submitted_date) <= ca_due_dt THEN 1 ELSE 0 END) AS ca_submitted_on_time,
          SUM(CASE WHEN DATE(ca_submitted_date) >= ca_due_dt THEN 1 ELSE 0 END) AS ca_submitted_late,
          SUM(CASE WHEN (ca_submitted_date IS NOT NULL AND TRIM(ca_submitted_date) <> '') AND (submitted_date IS NULL OR TRIM(submitted_date) = '') THEN 1 ELSE 0 END) AS total_open_verification,
          SUM(CASE WHEN (ca_submitted_date IS NULL OR TRIM(ca_submitted_date) = '') AND DATE(ca_due_dt) <= CURDATE() AND (submitted_date IS NULL OR TRIM(submitted_date) = '') THEN 1 ELSE 0 END) AS ca_open_past_due
        FROM ncr
        WHERE ca_action_req = 'Yes'
          AND active = 1
          AND ca_iss_to IS NOT NULL
          AND TRIM(ca_iss_to) <> ''
        GROUP BY CASE WHEN ca_iss_to IS NULL OR TRIM(ca_iss_to) = '' THEN 'No Department Selected' ELSE ca_iss_to END
      ) a
    `;

    const data = await this.mysqlService.query<NcrSummaryRow[]>(sql);

    let totalOpen = 0;
    let totalOpenCA = 0;
    let totalOpenVerifiation = 0;
    let totalNCR = 0;
    let caOpenPastDue = 0;
    let onTime = 0;

    for (const row of data) {
      totalOpen += Number(row.total_open || 0);
      totalOpenCA += Number(row.total_open_corrective_action || 0);
      totalOpenVerifiation += Number(row.total_open_verification || 0);
      totalNCR += Number(row.total_ncrs || 0);
      caOpenPastDue += Number(row.ca_open_past_due || 0);
      onTime += Number(row.ca_submitted_on_time || 0);
    }

    return {
      data,
      totalOpen,
      totalOpenCA,
      totalOpenVerifiation,
      totalNCR,
      ca_open_past_due: caOpenPastDue,
      otd: totalNCR > 0 ? (onTime / totalNCR) * 100 : 0,
    };
  }

  async getChart(): Promise<{ series: number[]; label: string[] }> {
    const sql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN DATE(ca_submitted_date) <= ca_due_dt THEN 1 ELSE 0 END) AS on_time
      FROM ncr
      WHERE ca_action_req = 'Yes'
        AND active = 1
    `;

    const rows = await this.mysqlService.query<NcrChartRow[]>(sql);
    const row = rows[0];

    return {
      series: [Number(row?.total || 0), Number(row?.on_time || 0)],
      label: [],
    };
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    const sql = `SELECT * FROM ncr WHERE id = ? LIMIT 1`;
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const entries = this.filterMutableColumns(payload);
    if (entries.length === 0) {
      throw new Error('No valid NCR fields provided for create');
    }

    const columns = entries.map(([key]) => `\`${key}\``).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const values = entries.map(([, value]) => value);

    const sql = `INSERT INTO ncr (${columns}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const entries = this.filterMutableColumns(payload);
    if (entries.length === 0) {
      return 0;
    }

    const setClause = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
    const values = entries.map(([, value]) => value);

    const sql = `UPDATE ncr SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async getNotificationRecipients(notificationKey: string): Promise<string[]> {
    const sql = `
      SELECT DISTINCT email
      FROM cron_email_notifications
      WHERE subscribed_to = ?
        AND active = 1
        AND email IS NOT NULL
        AND TRIM(email) <> ''
    `;

    const rows = await this.mysqlService.query<NotificationRecipientRow[]>(sql, [notificationKey]);
    return rows.map((row) => row.email.trim()).filter(Boolean);
  }

  async getComplaintCodes(): Promise<NcrComplaintCodeRow[]> {
    const sql = `SELECT * FROM ncr_complaint_codes`;
    return this.mysqlService.query<NcrComplaintCodeRow[]>(sql);
  }

  private filterMutableColumns(payload: Record<string, unknown>): Array<[string, unknown]> {
    return Object.entries(payload).filter(([key]) =>
      (NcrRepository.NCR_MUTABLE_COLUMNS as readonly string[]).includes(key),
    );
  }
}
