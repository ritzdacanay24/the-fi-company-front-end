import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface HitsRow extends RowDataPacket {
  hits: number;
}

interface InvoiceSummaryRow extends RowDataPacket {
  label: string;
  total: number;
}

interface JobSummaryAggregateRow extends RowDataPacket {
  total: number;
  year: number;
  month: number;
  open_total: number;
  completed_total: number;
  other_total: number;
  cancelled_total: number;
}

interface InvoiceSummaryResponse {
  chartData: {
    label: string[];
    value: number[];
  };
  details: RowDataPacket[];
}

interface JobSummaryResponse {
  chartData: {
    label: string[];
    open_total: number[];
    completed_total: number[];
    total: number[];
    cancelled_total: number[];
    other_total: number[];
  };
  details: RowDataPacket[];
}

@Injectable()
export class FieldServiceOverviewRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getOpenRequests(): Promise<HitsRow | null> {
    const rows = await this.mysqlService.query<HitsRow[]>(
      `
        SELECT COUNT(*) AS hits
        FROM fs_request a
        LEFT JOIN fs_scheduler b ON b.request_id = a.id
        WHERE a.active = 1
          AND b.id IS NULL
      `,
    );
    return rows[0] ?? null;
  }

  async getOpenJobs(): Promise<HitsRow | null> {
    const rows = await this.mysqlService.query<HitsRow[]>(
      `
        SELECT COUNT(*) AS hits
        FROM fs_scheduler a
        WHERE a.active = 1
          AND a.status IN ('Pending', 'Confirmed')
      `,
    );
    return rows[0] ?? null;
  }

  async getOpenTickets(): Promise<HitsRow | null> {
    const rows = await this.mysqlService.query<HitsRow[]>(
      `
        SELECT COUNT(*) AS hits
        FROM fs_workOrder a
        JOIN fs_scheduler b ON b.id = a.fs_scheduler_id AND b.active = 1
        WHERE a.active = 1
          AND a.dateSubmitted IS NULL
      `,
    );
    return rows[0] ?? null;
  }

  async getOpenInvoice(): Promise<HitsRow | null> {
    const rows = await this.mysqlService.query<HitsRow[]>(
      `
        SELECT COUNT(*) AS hits
        FROM fs_scheduler a
        JOIN fs_workOrder b ON b.fs_scheduler_id = a.id
          AND b.active = 1
          AND b.dateSubmitted IS NOT NULL
        WHERE a.invoice_date IS NULL
          AND a.active = 1
          AND a.status IN ('Pending', 'Confirmed', 'Completed')
      `,
    );
    return rows[0] ?? null;
  }

  async getInvoiceSummary(dateFrom: string, dateTo: string): Promise<InvoiceSummaryResponse> {
    const rows = await this.mysqlService.query<InvoiceSummaryRow[]>(
      `
        SELECT CONCAT(MONTH(invoice_date), '-', YEAR(invoice_date)) AS label,
               SUM(invoice) AS total,
               MONTH(invoice_date) AS month,
               YEAR(invoice_date) AS year
        FROM fs_scheduler
        WHERE invoice_date BETWEEN ? AND ?
        GROUP BY CONCAT(MONTH(invoice_date), '-', YEAR(invoice_date)),
                 MONTH(invoice_date),
                 YEAR(invoice_date)
        ORDER BY YEAR(invoice_date) ASC,
                 MONTH(invoice_date) ASC
      `,
      [dateFrom, dateTo],
    );

    const details = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT *
        FROM fs_scheduler
        WHERE invoice_date BETWEEN ? AND ?
      `,
      [dateFrom, dateTo],
    );

    return {
      chartData: {
        label: rows.map((row) => row.label),
        value: rows.map((row) => Number(row.total || 0)),
      },
      details,
    };
  }

  async getJobSummary(dateFrom: string, dateTo: string): Promise<JobSummaryResponse> {
    const rows = await this.mysqlService.query<JobSummaryAggregateRow[]>(
      `
        SELECT COUNT(*) AS total,
               YEAR(request_date) AS year,
               MONTH(request_date) AS month,
               SUM(CASE WHEN status IN ('Pending', 'Confirmed') THEN 1 ELSE 0 END) AS open_total,
               SUM(CASE WHEN status IN ('Completed') THEN 1 ELSE 0 END) AS completed_total,
               SUM(CASE WHEN status NOT LIKE '%cancelled%' AND status NOT IN ('Pending', 'Confirmed', 'Completed') THEN 1 ELSE 0 END) AS other_total,
               SUM(CASE WHEN status LIKE '%cancelled%' THEN 1 ELSE 0 END) AS cancelled_total
        FROM fs_scheduler
        WHERE request_date BETWEEN ? AND ?
          AND active = 1
          AND service_type <> ''
        GROUP BY MONTH(request_date),
                 YEAR(request_date)
      `,
      [dateFrom, dateTo],
    );

    const details = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT *
        FROM fs_scheduler
        WHERE request_date BETWEEN ? AND ?
          AND active = 1
      `,
      [dateFrom, dateTo],
    );

    const chartData = {
      label: [] as string[],
      open_total: [] as number[],
      completed_total: [] as number[],
      total: [] as number[],
      cancelled_total: [] as number[],
      other_total: [] as number[],
    };

    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const cursor = new Date(start);
      while (cursor.getTime() < end.getTime()) {
        cursor.setMonth(cursor.getMonth() + 1);
        if (cursor.getTime() > end.getTime()) {
          break;
        }

        const month = cursor.getMonth() + 1;
        const year = cursor.getFullYear();
        const label = `${this.getMonthName(month)}-${year}`;

        const match = rows.find((row) => Number(row.month) === month && Number(row.year) === year);

        chartData.label.push(label);
        chartData.open_total.push(Number(match?.open_total || 0));
        chartData.completed_total.push(Number(match?.completed_total || 0));
        chartData.total.push(Number(match?.total || 0));
        chartData.cancelled_total.push(Number(match?.cancelled_total || 0));
        chartData.other_total.push(Number(match?.other_total || 0));
      }
    }

    return {
      chartData,
      details,
    };
  }

  private getMonthName(month: number): string {
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return names[month - 1] ?? '';
  }
}
