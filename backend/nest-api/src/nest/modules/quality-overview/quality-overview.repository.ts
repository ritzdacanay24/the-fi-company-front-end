import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface HitsRow extends RowDataPacket {
  hits: number;
}

interface ChartRow extends RowDataPacket {
  value: number;
  label: string;
}

@Injectable()
export class QualityOverviewRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getOpenRequests(): Promise<HitsRow | null> {
    const sql = `
      SELECT COUNT(*) AS hits
      FROM qa_capaRequest a
      WHERE a.active = 1
        AND a.status = 'Open'
    `;
    const rows = await this.mysqlService.query<HitsRow[]>(sql);
    return rows[0] || null;
  }

  async getOpenJobs(): Promise<HitsRow | null> {
    const sql = `
      SELECT COUNT(*) AS hits
      FROM ncr a
      WHERE a.active = 1
        AND a.submitted_date IS NULL
    `;
    const rows = await this.mysqlService.query<HitsRow[]>(sql);
    return rows[0] || null;
  }

  async getOpenTickets(): Promise<HitsRow | null> {
    const sql = `
      SELECT COUNT(*) AS hits
      FROM qa_capaRequest a
      WHERE a.active = 1
        AND a.status = 'Open'
        AND a.TYPE1 LIKE '%External%'
    `;
    const rows = await this.mysqlService.query<HitsRow[]>(sql);
    return rows[0] || null;
  }

  async getOpenInvoice(): Promise<HitsRow | null> {
    const sql = `
      SELECT COUNT(*) AS hits
      FROM fs_scheduler a
      JOIN fs_workOrder b
        ON b.fs_scheduler_id = a.id
       AND b.active = 1
       AND b.dateSubmitted IS NOT NULL
      WHERE a.invoice_date IS NULL
        AND a.active = 1
        AND a.status IN ('Pending', 'Confirmed', 'Completed')
    `;
    const rows = await this.mysqlService.query<HitsRow[]>(sql);
    return rows[0] || null;
  }

  async getInvoiceSummary(dateFrom: string, dateTo: string): Promise<{ chartData: { label: string[]; value: number[] } }> {
    const sql = `
      SELECT
        COUNT(*) AS value,
        failureType AS label
      FROM eyefidb.qa_capaRequest
      WHERE id != 0
        AND DATE(createdDate) BETWEEN ? AND ?
        AND failureType <> ''
      GROUP BY failureType
      ORDER BY COUNT(*) DESC
    `;

    const rows = await this.mysqlService.query<ChartRow[]>(sql, [dateFrom, dateTo]);
    return this.toChartData(rows);
  }

  async getJobSummary(dateFrom: string, dateTo: string): Promise<{ chartData: { label: string[]; value: number[] } }> {
    const sql = `
      SELECT
        COUNT(*) AS value,
        complaint_code AS label
      FROM eyefidb.ncr
      WHERE id != 0
        AND DATE(created_date) BETWEEN ? AND ?
        AND complaint_code <> ''
      GROUP BY complaint_code
      ORDER BY COUNT(*) DESC
    `;

    const rows = await this.mysqlService.query<ChartRow[]>(sql, [dateFrom, dateTo]);
    return this.toChartData(rows);
  }

  private toChartData(rows: ChartRow[]): { chartData: { label: string[]; value: number[] } } {
    return {
      chartData: {
        label: rows.map((row) => row.label),
        value: rows.map((row) => Number(row.value || 0)),
      },
    };
  }
}
