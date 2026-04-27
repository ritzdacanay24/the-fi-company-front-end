import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

export interface TicketEventReportRow extends RowDataPacket {
  label: string;
  fs_scheduler_id: number | null;
  service_type: string | null;
  customer: string | null;
  sign_theme: string | null;
  sign_type: string | null;
  platform: string | null;
}

export interface TicketEventChartRow extends RowDataPacket {
  value: number;
  label: string;
  month: number;
  year: number;
  request_date: string;
  background_color: string | null;
  event_type: number | null;
}

export interface CustomerReportRow extends RowDataPacket {
  hits: number;
  customer: string | null;
  completed_jobs: number;
}

export interface ExpenseReportRow extends RowDataPacket {
  name: string | null;
  fs_scheduler_id: number | null;
  workOrderId: number | null;
  request_date: string;
  mark_up: number | null;
  mark_up_percent: number | null;
  billing: number | null;
  total_cost: number | null;
}

export interface ExpenseChartRow extends RowDataPacket {
  label: string;
  background_color: string | null;
  value: number;
  month: number;
  year: number;
  request_date: string;
}

export interface InvoiceReportRow extends RowDataPacket {
  id: number;
  request_date: string;
  service_type: string | null;
  customer: string | null;
  sign_theme: string | null;
  billable: string | null;
  acc_status: string | null;
  invoice_date: string | null;
  invoice_notes: string | null;
  invoice_number: string | null;
  period: string | null;
  vendor_cost: number | null;
  vendor_inv_number: string | null;
  invoice: number | null;
}

export interface InvoiceChartRow extends RowDataPacket {
  label: string;
  value: number;
  month: number;
  year: number;
  invoice_date: string;
  background_color: string | null;
}

export interface JobByLocationRow extends RowDataPacket {
  hits: number;
  property: string | null;
  city: string | null;
  state: string | null;
}

export interface PlatformAvgRow extends RowDataPacket {
  platform: string;
  service_type: string | null;
  total_mins: number;
  avg_mins: number;
  jobs: number;
}

export interface ContractorVsTechReportRow extends RowDataPacket {
  total: number;
  month: number;
  year: number;
  request_date: string;
  contractor_assigned: number;
  tech_jobs_assigned: number;
  contractor: number;
  tech: number;
  contractor_code: string | null;
}

export interface ContractorVsTechChartRow extends RowDataPacket {
  value: number;
  month: number;
  year: number;
  request_date: string;
  contractor_assigned: number;
  tech_jobs_assigned: number;
  label: string;
  background_color: string;
}

export interface ServiceReportRow extends RowDataPacket {
  hits: number;
  service_type: string;
  completed_jobs: number;
}

export interface ServiceChartRow extends RowDataPacket {
  label: string;
  background_color: string | null;
  value: number;
  month: number;
  year: number;
  request_date: string;
}

export interface JobByUserReportRow extends RowDataPacket {
  user: string;
  out_of_town: number;
  in_town: number;
  total: number;
}

export interface JobByUserChartRow extends RowDataPacket {
  user: string;
  total: number;
  month: number;
  year: number;
  request_date: string;
}

export interface RevenueAllRow extends RowDataPacket {
  price: number;
  daten: string;
  month: number;
  year: number;
  tyoeof: string;
}

export interface FutureRevenueByCustomerSummaryRow extends RowDataPacket {
  so_cust: string;
  month: number;
  year: number;
  balance: number;
}

export interface FutureRevenueByCustomerWeeklyRow extends RowDataPacket {
  so_cust: string;
  date1: string;
  total: number;
  revenue_after_tariff: number;
  tariff_amount: number;
  net_revenue: number;
}

export interface DailyReportConfigRow extends RowDataPacket {
  id: number;
  user_id: number | null;
  sort_column: string | null;
  hidden_column: string | null;
  'Column 5'?: number | null;
}

@Injectable()
export class ReportsRepository extends BaseRepository<RowDataPacket> {
  constructor(
    @Inject(MysqlService) mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qad: QadOdbcService,
  ) {
    super('eyefidb.fs_labor_view', mysqlService);
  }

  async getTicketEventReport(dateFrom: string, dateTo: string): Promise<TicketEventReportRow[]> {
    return this.rawQuery<TicketEventReportRow>(
      `
        SELECT a.*,
               CASE
                 WHEN d.event_type = 0 THEN 'Other'
                 WHEN d.event_type = 1 THEN 'Service'
                 WHEN d.event_type = 2 THEN 'Travel'
                 WHEN d.event_type = 3 THEN 'Non-Service'
               END AS label,
               c.id AS fs_scheduler_id,
               c.service_type,
               c.customer,
               c.sign_theme,
               c.sign_type,
               c.platform
        FROM eyefidb.fs_labor_view a
        LEFT JOIN eyefidb.fs_workOrder b ON b.id = a.workOrderId
        LEFT JOIN eyefidb.fs_scheduler c ON c.id = b.fs_scheduler_id
        LEFT JOIN eyefidb.fs_event_type d ON d.event_name = a.event_name
        WHERE c.request_date BETWEEN ? AND ?
          AND d.isEvent = 1
        ORDER BY a.workOrderId, c.request_date
      `,
      [dateFrom, dateTo],
    );
  }

  async getDailyReportConfigByUserId(userId: string): Promise<DailyReportConfigRow | null> {
    const rows = await this.rawQuery<DailyReportConfigRow>(
      `
        SELECT *
        FROM daily_report_config
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId],
    );

    return rows[0] ?? null;
  }

  async getTicketEventReportChartRows(dateFrom: string, dateTo: string): Promise<TicketEventChartRow[]> {
    return this.rawQuery<TicketEventChartRow>(
      `
        SELECT SUM(a.qtr_hrs) AS value,
               CASE
                 WHEN d.event_type = 0 THEN 'Other'
                 WHEN d.event_type = 1 THEN 'Service'
                 WHEN d.event_type = 2 THEN 'Travel'
                 WHEN d.event_type = 3 THEN 'Non-Service'
               END AS label,
               MONTH(c.request_date) AS month,
               YEAR(c.request_date) AS year,
               c.request_date,
               d.background_color,
               d.event_type
        FROM eyefidb.fs_labor_view a
        LEFT JOIN eyefidb.fs_workOrder b ON b.id = a.workOrderId
        LEFT JOIN eyefidb.fs_scheduler c ON c.id = b.fs_scheduler_id
        LEFT JOIN eyefidb.fs_event_type d ON d.event_name = a.event_name
        WHERE c.request_date BETWEEN ? AND ?
          AND d.event_name IS NOT NULL
          AND d.isEvent = 1
        GROUP BY
          CASE
            WHEN d.event_type = 0 THEN 'Other'
            WHEN d.event_type = 1 THEN 'Service'
            WHEN d.event_type = 2 THEN 'Travel'
            WHEN d.event_type = 3 THEN 'Non-Service'
          END,
          MONTH(c.request_date),
          YEAR(c.request_date),
          c.request_date,
          d.background_color,
          d.event_type
        HAVING value > 0
        ORDER BY SUM(a.qtr_hrs) ASC
      `,
      [dateFrom, dateTo],
    );
  }

  async getCustomerReport(dateFrom: string, dateTo: string): Promise<CustomerReportRow[]> {
    return this.rawQuery<CustomerReportRow>(
      `
        SELECT COUNT(*) AS hits,
               customer,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_jobs
        FROM eyefidb.fs_scheduler
        WHERE request_date BETWEEN ? AND ?
        GROUP BY customer
        ORDER BY COUNT(*) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getExpenseReport(dateFrom: string, dateTo: string): Promise<ExpenseReportRow[]> {
    return this.rawQuery<ExpenseReportRow>(
      `
        SELECT *
        FROM eyefidb.fs_billing_expense_view
        WHERE request_date BETWEEN ? AND ?
        ORDER BY request_date DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getExpenseReportChartRows(dateFrom: string, dateTo: string): Promise<ExpenseChartRow[]> {
    return this.rawQuery<ExpenseChartRow>(
      `
        SELECT CASE
                 WHEN name = 'Airfare' THEN 'Airfare'
                 WHEN name = 'Equipment Rental' THEN 'Equipment Rental'
                 WHEN name = 'Rental Car' THEN 'Rental Car'
                 WHEN name = 'Hotel' THEN 'Hotel'
                 WHEN name = 'Supplies' THEN 'Supplies'
                 ELSE 'Other'
               END AS label,
               a.background_color,
               SUM(total_cost) AS value,
               MONTH(request_date) AS month,
               YEAR(request_date) AS year,
               request_date
        FROM eyefidb.fs_billing_expense_view
        LEFT JOIN eyefidb.fs_trip_settings a
          ON a.category = CASE
                            WHEN name = 'Airfare' THEN 'Airfare'
                            WHEN name = 'Equipment Rental' THEN 'Equipment Rental'
                            WHEN name = 'Rental Car' THEN 'Rental Car'
                            WHEN name = 'Hotel' THEN 'Hotel'
                            WHEN name = 'Supplies' THEN 'Supplies'
                            ELSE 'Other'
                          END
        WHERE request_date BETWEEN ? AND ?
        GROUP BY CASE
                   WHEN name = 'Airfare' THEN 'Airfare'
                   WHEN name = 'Equipment Rental' THEN 'Equipment Rental'
                   WHEN name = 'Rental Car' THEN 'Rental Car'
                   WHEN name = 'Hotel' THEN 'Hotel'
                   WHEN name = 'Supplies' THEN 'Supplies'
                   ELSE 'Other'
                 END,
                 MONTH(request_date),
                 YEAR(request_date),
                 request_date,
                 a.background_color
      `,
      [dateFrom, dateTo],
    );
  }

  async getInvoiceReport(dateFrom: string, dateTo: string): Promise<InvoiceReportRow[]> {
    return this.rawQuery<InvoiceReportRow>(
      `
        SELECT *
        FROM eyefidb.fs_scheduler
        WHERE acc_status = 'INVOICED'
          AND invoice_date BETWEEN ? AND ?
      `,
      [dateFrom, dateTo],
    );
  }

  async getInvoiceByCustomerChartRows(dateFrom: string, dateTo: string): Promise<InvoiceChartRow[]> {
    return this.rawQuery<InvoiceChartRow>(
      `
        SELECT CASE
                 WHEN name IN ('SG', 'L&W', 'Bally') THEN 'L&W'
                 WHEN name = 'ATI' THEN 'ATI'
                 WHEN name = 'Everi' THEN 'Everi'
                 WHEN name = 'IGT' THEN 'IGT'
                 WHEN name = 'AGS' THEN 'AGS'
                 ELSE 'Other'
               END AS label,
               SUM(invoice) AS value,
               MONTH(invoice_date) AS month,
               YEAR(invoice_date) AS year,
               invoice_date,
               CASE
                 WHEN name IN ('SG', 'L&W', 'Bally') THEN '#0392cf'
                 ELSE c.background_color
               END AS background_color
        FROM eyefidb.fs_scheduler a
        LEFT JOIN eyefidb.fs_company_det c ON c.name = a.customer
        WHERE invoice_date BETWEEN ? AND ?
          AND acc_status = 'INVOICED'
          AND invoice > 0
        GROUP BY CASE
                   WHEN name IN ('SG', 'L&W', 'Bally') THEN 'L&W'
                   WHEN name = 'ATI' THEN 'ATI'
                   WHEN name = 'Everi' THEN 'Everi'
                   WHEN name = 'IGT' THEN 'IGT'
                   WHEN name = 'AGS' THEN 'AGS'
                   ELSE 'Other'
                 END,
                 MONTH(invoice_date),
                 YEAR(invoice_date),
                 invoice_date,
                 CASE
                   WHEN name IN ('SG', 'L&W', 'Bally') THEN '#0392cf'
                   ELSE c.background_color
                 END
        ORDER BY SUM(invoice) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getJobByLocation(dateFrom: string, dateTo: string): Promise<JobByLocationRow[]> {
    return this.rawQuery<JobByLocationRow>(
      `
        SELECT COUNT(*) AS hits,
               property,
               city,
               state
        FROM eyefidb.fs_scheduler
        WHERE request_date BETWEEN ? AND ?
        GROUP BY property, city, state
        ORDER BY COUNT(*) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getPlatformAvg(dateFrom: string, dateTo: string): Promise<PlatformAvgRow[]> {
    return this.rawQuery<PlatformAvgRow>(
      `
        SELECT fs_work_order_summary_view.platform AS platform,
               fs_work_order_summary_view.service_type AS service_type,
               SUM(fs_work_order_summary_view.service_mins) AS total_mins,
               TRUNCATE(AVG(fs_work_order_summary_view.service_mins), 2) AS avg_mins,
               COUNT(fs_work_order_summary_view.platform) AS jobs
        FROM eyefidb.fs_work_order_summary_view
        WHERE fs_work_order_summary_view.platform <> ''
          AND request_date BETWEEN ? AND ?
        GROUP BY fs_work_order_summary_view.platform,
                 fs_work_order_summary_view.service_type
      `,
      [dateFrom, dateTo],
    );
  }

  async getContractorVsTechReport(dateFrom: string, dateTo: string): Promise<ContractorVsTechReportRow[]> {
    return this.rawQuery<ContractorVsTechReportRow>(
      `
        SELECT COUNT(*) AS total,
               MONTH(request_date) AS month,
               YEAR(request_date) AS year,
               request_date,
               SUM(CASE WHEN b.contractor_code IS NOT NULL THEN 1 ELSE 0 END) AS contractor_assigned,
               SUM(CASE WHEN b.contractor_code IS NULL THEN 1 ELSE 0 END) AS tech_jobs_assigned,
               CASE WHEN b.contractor_code IS NOT NULL THEN 1 ELSE 0 END AS contractor,
               CASE WHEN b.contractor_code IS NULL THEN 1 ELSE 0 END AS tech,
               b.contractor_code
        FROM eyefidb.fs_scheduler a
        LEFT JOIN eyefidb.fs_team b ON b.fs_det_id = a.id
        WHERE request_date BETWEEN ? AND ?
        GROUP BY MONTH(request_date),
                 YEAR(request_date),
                 request_date,
                 b.contractor_code,
                 CASE WHEN b.contractor_code IS NOT NULL THEN 1 ELSE 0 END,
                 CASE WHEN b.contractor_code IS NULL THEN 1 ELSE 0 END,
                 b.contractor_code
        ORDER BY YEAR(request_date) DESC,
                 MONTH(request_date) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getContractorVsTechReportChartRows(dateFrom: string, dateTo: string): Promise<ContractorVsTechChartRow[]> {
    return this.rawQuery<ContractorVsTechChartRow>(
      `
        SELECT COUNT(*) AS value,
               MONTH(request_date) AS month,
               YEAR(request_date) AS year,
               request_date,
               SUM(CASE WHEN b.contractor_code IS NOT NULL THEN 1 ELSE 0 END) AS contractor_assigned,
               SUM(CASE WHEN b.contractor_code IS NULL THEN 1 ELSE 0 END) AS tech_jobs_assigned,
               CASE WHEN b.contractor_code IS NOT NULL THEN 'Contractor' ELSE 'Tech' END AS label,
               CASE WHEN b.contractor_code IS NOT NULL THEN '#22afb1' ELSE '#2271B1' END AS background_color
        FROM eyefidb.fs_scheduler a
        LEFT JOIN eyefidb.fs_team b ON b.fs_det_id = a.id
        WHERE request_date BETWEEN ? AND ?
        GROUP BY MONTH(request_date),
                 YEAR(request_date),
                 request_date,
                 CASE WHEN b.contractor_code IS NOT NULL THEN 'Contractor' ELSE 'Tech' END,
                 CASE WHEN b.contractor_code IS NOT NULL THEN '#22afb1' ELSE '#2271B1' END
        ORDER BY YEAR(request_date) DESC,
                 MONTH(request_date) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getServiceReport(dateFrom: string, dateTo: string): Promise<ServiceReportRow[]> {
    return this.rawQuery<ServiceReportRow>(
      `
        SELECT COUNT(*) AS hits,
               service_type,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_jobs
        FROM eyefidb.fs_scheduler
        WHERE request_date BETWEEN ? AND ?
          AND active = 1
          AND service_type <> ''
        GROUP BY service_type
        ORDER BY COUNT(*) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getServiceReportChartRows(dateFrom: string, dateTo: string): Promise<ServiceChartRow[]> {
    return this.rawQuery<ServiceChartRow>(
      `
        SELECT service_type AS label,
               a.background_color,
               COUNT(*) AS value,
               MONTH(request_date) AS month,
               YEAR(request_date) AS year,
               request_date
        FROM eyefidb.fs_scheduler b
        LEFT JOIN eyefidb.fs_service_category a ON a.name = service_type
        WHERE request_date BETWEEN ? AND ?
          AND service_type <> ''
          AND b.active = 1
        GROUP BY service_type,
                 MONTH(request_date),
                 YEAR(request_date),
                 request_date,
                 a.background_color
        ORDER BY COUNT(*) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getJobByUserReport(dateFrom: string, dateTo: string): Promise<JobByUserReportRow[]> {
    return this.rawQuery<JobByUserReportRow>(
      `
        SELECT b.user,
               SUM(CASE WHEN a.out_of_state = 'Yes' THEN 1 ELSE 0 END) AS out_of_town,
               SUM(CASE WHEN a.out_of_state = 'No' THEN 1 ELSE 0 END) AS in_town,
               COUNT(*) AS total
        FROM eyefidb.fs_scheduler a
        LEFT JOIN eyefidb.fs_team b ON b.fs_det_id = a.id
        WHERE request_date BETWEEN ? AND ?
          AND status IN ('Completed', 'Confirmed')
        GROUP BY b.user
        ORDER BY COUNT(*) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getJobByUserReportChartRows(dateFrom: string, dateTo: string): Promise<JobByUserChartRow[]> {
    return this.rawQuery<JobByUserChartRow>(
      `
        SELECT b.user,
               COUNT(*) AS total,
               MONTH(request_date) AS month,
               YEAR(request_date) AS year,
               request_date
        FROM eyefidb.fs_scheduler a
        LEFT JOIN eyefidb.fs_team b ON b.fs_det_id = a.id
        WHERE request_date BETWEEN ? AND ?
          AND b.user <> ''
        GROUP BY b.user,
                 MONTH(request_date),
                 YEAR(request_date),
                 request_date
        ORDER BY COUNT(*) DESC
      `,
      [dateFrom, dateTo],
    );
  }

  async getRevenueAllRows(dateFrom: string, dateTo: string): Promise<RevenueAllRow[]> {
    const sql = `
      SELECT price,
             daten,
             month,
             year,
             RTRIM(tyoeOf) AS tyoeOf
      FROM (
        SELECT SUM(a.PostingLineCreditLC - a.PostingLineDebitLC) AS price,
               PostingDate AS daten,
               MONTH(PostingDate) AS month,
               YEAR(PostingDate) AS year,
               CASE
                 WHEN a.GL_ID = 15774615 THEN 'Product'
                 WHEN a.GL_ID = 15774617 THEN 'Service Storage'
                 WHEN a.GL_ID IN (15774616, 15790482, 15790530) THEN 'Service Parts'
                 WHEN a.GL_ID = 15774618 THEN 'Kitting'
                 ELSE 'Graphics'
               END AS tyoeOf
        FROM PostingLine a
        LEFT JOIN (
          SELECT Posting_ID,
                 DInvoice_ID
          FROM DInvoicePosting
        ) b ON b.Posting_ID = a.Posting_ID
        WHERE a.gl_id IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065)
          AND PostingDate <> '2022-12-31'
        GROUP BY PostingDate,
                 MONTH(PostingDate),
                 YEAR(PostingDate),
                 CASE
                   WHEN a.GL_ID = 15774615 THEN 'Product'
                   WHEN a.GL_ID = 15774617 THEN 'Service Storage'
                   WHEN a.GL_ID IN (15774616, 15790482, 15790530) THEN 'Service Parts'
                   WHEN a.GL_ID = 15774618 THEN 'Kitting'
                   ELSE 'Graphics'
                 END

        UNION ALL

        SELECT SUM((sod_qty_ord - sod_qty_ship) * sod_price) AS price,
               sod_due_date AS daten,
               MONTH(sod_due_date) AS month,
               YEAR(sod_due_date) AS year,
               CASE WHEN sod_qty_ord != sod_qty_ship THEN 'Open' ELSE 'total_shipped' END AS tyoeOf
        FROM sod_det a
        WHERE sod_domain = 'EYE'
          AND sod_qty_ord != sod_qty_ship
        GROUP BY sod_due_date,
                 MONTH(sod_due_date),
                 YEAR(sod_due_date),
                 CASE WHEN sod_qty_ord != sod_qty_ship THEN 'Open' ELSE 'total_shipped' END

        UNION ALL

        SELECT SUM(abs_ship_qty * sod_price) AS price,
               abs_shp_date AS daten,
               MONTH(abs_shp_date) AS month,
               YEAR(abs_shp_date) AS year,
               CASE WHEN abs_inv_nbr != '' THEN 'invoiced_amount' ELSE 'Pending Invoice' END AS tyoeOf
        FROM abs_mstr a
        LEFT JOIN (
          SELECT sod_price,
                 sod_line,
                 sod_nbr,
                 sod_acct
          FROM sod_det
          WHERE sod_domain = 'EYE'
            AND sod_domain = 'EYE'
        ) b ON b.sod_nbr = a.abs_order AND b.sod_line = a.abs_line
        WHERE abs_domain = 'EYE'
          AND abs_inv_nbr = ''
        GROUP BY abs_shp_date,
                 MONTH(abs_shp_date),
                 YEAR(abs_shp_date),
                 CASE WHEN abs_inv_nbr != '' THEN 'invoiced_amount' ELSE 'Pending Invoice' END
      ) a
      WHERE daten BETWEEN ? AND ?
         OR (MONTH(daten) = MONTH(CURDATE()) AND YEAR(daten) = YEAR(CURDATE()))
      ORDER BY CASE
                 WHEN tyoeOf = 'Product' THEN 1
                 WHEN tyoeOf = 'Service Storage' THEN 2
                 WHEN tyoeOf = 'Service Parts' THEN 3
                 WHEN tyoeOf = 'Kitting' THEN 4
                 WHEN tyoeOf = 'Graphics' THEN 5
                 WHEN tyoeOf = 'Pending Invoice' THEN 6
                 WHEN tyoeOf = 'Open' THEN 7
               END ASC
    `;

    return this.qad.queryWithParams<RevenueAllRow[]>(sql, [dateFrom, dateTo], { keyCase: 'lower' });
  }

  async getFutureRevenueByCustomerRows(applyAgsDiscount: boolean): Promise<FutureRevenueByCustomerSummaryRow[]> {
    const discountMultiplier = applyAgsDiscount ? '0.91' : '1.0';
    const sql = `
      SELECT c.so_cust AS so_cust,
             MONTH(a.sod_per_date) AS month,
             YEAR(a.sod_per_date) AS year,
             SUM(
               CASE
                 WHEN c.so_cust = 'AMEGAM' THEN (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) * ${discountMultiplier}
                 ELSE (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship))
               END
             ) AS balance
      FROM sod_det a
      JOIN (
        SELECT so_nbr,
               so_cust,
               so_ord_date,
               so_ship,
               so_bol,
               so_cmtindx,
               so_compl_date,
               so_shipvia
        FROM so_mstr
        WHERE so_domain = 'EYE'
          AND so_compl_date IS NULL
      ) c ON c.so_nbr = a.sod_nbr
      WHERE sod_domain = 'EYE'
        AND sod_qty_ord != sod_qty_ship
        AND sod_project = ''
        AND sod_part != 'DISCOUNT'
      GROUP BY c.so_cust,
               MONTH(a.sod_per_date),
               YEAR(a.sod_per_date)
      ORDER BY a.sod_per_date ASC
    `;

    return this.qad.query<FutureRevenueByCustomerSummaryRow[]>(sql, { keyCase: 'lower' });
  }

  async getFutureRevenueByCustomerWeeklyRows(
    start: string,
    end: string,
  ): Promise<FutureRevenueByCustomerWeeklyRow[]> {
    const sql = `
      SELECT c.so_cust AS so_cust,
             a.sod_per_date AS date1,
             (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) AS total,
             CASE
               WHEN c.so_cust IN ('AMEGAM', 'ZITRO', 'ECLIPSE') THEN (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) * 0.91
               ELSE (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship))
             END AS revenue_after_tariff,
             CASE
               WHEN c.so_cust IN ('AMEGAM', 'ZITRO', 'ECLIPSE') THEN (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) * 0.09
               WHEN c.so_cust IN ('INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY') AND sod_prodline = 'TAR' THEN (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship))
               ELSE 0
             END AS tariff_amount,
             CASE
               WHEN c.so_cust IN ('INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY') AND sod_prodline <> 'TAR' THEN (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship))
               WHEN c.so_cust IN ('INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY') AND sod_prodline = 'TAR' THEN 0
               WHEN c.so_cust IN ('AMEGAM', 'ZITRO', 'ECLIPSE') THEN (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) * 0.91
               ELSE (a.sod_price * (a.sod_qty_ord - a.sod_qty_ship))
             END AS net_revenue
      FROM sod_det a
      JOIN (
        SELECT so_nbr,
               so_cust,
               so_ord_date,
               so_ship,
               so_bol,
               so_cmtindx,
               so_compl_date,
               so_shipvia
        FROM so_mstr
        WHERE so_domain = 'EYE'
          AND so_compl_date IS NULL
      ) c ON c.so_nbr = a.sod_nbr
      WHERE sod_domain = 'EYE'
        AND sod_project = ''
        AND sod_qty_ord != sod_qty_ship
        AND a.sod_per_date BETWEEN ? AND ?
        AND sod_part != 'DISCOUNT'
      ORDER BY a.sod_due_date ASC
    `;

    return this.qad.queryWithParams<FutureRevenueByCustomerWeeklyRow[]>(sql, [start, end], { keyCase: 'upper' });
  }

  // ─── Operations Reports (migrated from legacy PHP) ───────────────────────────

  async getJiaxingLocationValue(name: string): Promise<Record<string, unknown>[]> {
    let locationFilter: string;
    if (name === 'FG') {
      locationFilter = `cc.loc_type = '${name}'`;
    } else {
      locationFilter = `a.ld_loc = '${name}'`;
    }

    const sql = `
      SELECT a.ld_part,
             c.last_receipt,
             a.ld_lot,
             a.ld_qty_oh,
             b.pt_desc2,
             d.sct_cst_tot,
             a.ld_qty_oh * d.sct_cst_tot AS ext_cost,
             CONCAT(b.pt_desc1, b.pt_desc2) AS pt_desc1,
             b.pt_vend
      FROM ld_det a
      JOIN (
        SELECT pt_part,
               MAX(pt_desc1) AS pt_desc1,
               MAX(pt_desc2) AS pt_desc2,
               MAX(pt_vend)  AS pt_vend
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
          AND RIGHT(pt_part, 1) != 'U'
          AND RIGHT(pt_part, 1) != 'R'
          AND RIGHT(pt_part, 1) != 'N'
        GROUP BY pt_part
      ) b ON b.pt_part = a.ld_part
      LEFT JOIN (
        SELECT tr_part, MAX(tr_effdate) AS last_receipt
        FROM tr_hist
        WHERE tr_type IN ('RCT-PO', 'RCT-UNP', 'RCT-WO')
          AND tr_domain = 'EYE'
        GROUP BY tr_part
      ) c ON c.tr_part = a.ld_part
      LEFT JOIN (
        SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = 'EYE'
        GROUP BY sct_part
      ) d ON CAST(a.ld_part AS CHAR(25)) = d.sct_part
      LEFT JOIN (
        SELECT loc_loc, MAX(loc_type) AS loc_type
        FROM loc_mstr
        WHERE loc_domain = 'EYE'
        GROUP BY loc_loc
      ) cc ON cc.loc_loc = a.ld_loc
      WHERE ${locationFilter}
        AND ld_domain = 'EYE'
      ORDER BY a.ld_qty_oh * d.sct_cst_tot DESC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getLasVegasRawMaterial(): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT CAST(SUM(a.ld_qty_oh) AS NUMERIC(36,2)) AS qtyoh,
             SUM(a.ld_qty_oh * c.sct_cst_tot) AS totalvalue,
             ld_part,
             MAX(b.pt_article) AS pt_article,
             MAX(b.pt_prod_line) AS pt_prod_line,
             MAX(d.pl_desc) AS pl_desc,
             MAX(b.pt_desc1) || ' ' || MAX(b.pt_desc2) AS fulldesc,
             MAX(IFNULL(open_wo.open_wo_qty, 0)) AS open_wo_qty
      FROM ld_det a
      LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE'
      LEFT JOIN (
        SELECT pl_prod_line, pl_desc
        FROM pl_mstr
        WHERE pl_domain = 'EYE'
      ) d ON d.pl_prod_line = b.pt_prod_line
      LEFT JOIN (
        SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = 'EYE'
          AND sct_site = 'EYE01'
        GROUP BY sct_part
      ) c ON b.pt_part = c.sct_part
      JOIN (
        SELECT loc_loc, MAX(loc_type) AS loc_type
        FROM loc_mstr
        WHERE loc_domain = 'EYE'
          AND loc_type NOT IN ('FG', 'SS')
        GROUP BY loc_loc
      ) cc ON cc.loc_loc = a.ld_loc
      LEFT JOIN (
        SELECT wo_part, SUM(wo_qty_ord - wo_qty_comp) AS open_wo_qty
        FROM wo_mstr
        WHERE wo_domain = 'EYE'
          AND wo_status = 'R'
        GROUP BY wo_part
      ) open_wo ON open_wo.wo_part = a.ld_part
      WHERE ld_domain = 'EYE'
        AND a.ld_qty_oh > 0
        AND ld_site = 'EYE01'
        AND CASE WHEN RIGHT(b.pt_part, 1) != 'U'
                  AND RIGHT(b.pt_part, 1) != 'R'
                  AND RIGHT(b.pt_part, 1) != 'N'
             THEN '-' ELSE 'COI' END != 'COI'
      GROUP BY ld_part
      ORDER BY SUM(a.ld_qty_oh * c.sct_cst_tot) DESC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getShippedOrdersGrouped(dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT a.sod_nbr,
             a.sod_due_date,
             a.sod_part,
             CAST(a.sod_qty_ord AS DECIMAL(16,2)) AS sod_qty_ord,
             CAST(a.sod_qty_ship AS DECIMAL(16,2)) AS sod_qty_ship,
             a.sod_price,
             a.sod_contr_id,
             a.sod_domain,
             a.sod_compl_stat,
             CASE WHEN b.pt_part IS NULL THEN a.sod_desc ELSE CONCAT(b.pt_desc1, b.pt_desc2) END AS fullDesc,
             c.so_cust,
             a.sod_line,
             c.so_ord_date,
             c.so_ship,
             CASE WHEN a.sod_due_date > f.abs_shp_date THEN 'Shipped before due date'
                  WHEN a.sod_due_date = f.abs_shp_date THEN 'Shipped on due date'
                  WHEN a.sod_due_date < f.abs_shp_date THEN 'Shipped after due date'
             END AS status,
             CASE WHEN a.sod_due_date > f.abs_shp_date THEN 'badge badge-success'
                  WHEN a.sod_due_date = f.abs_shp_date THEN 'badge badge-warning'
                  WHEN a.sod_due_date < f.abs_shp_date THEN 'badge badge-danger'
             END AS status_class,
             a.sod_order_category,
             a.sod_custpart AS cp_cust_part,
             c.so_bol,
             f.abs_shp_date,
             f.abs_item,
             f.abs_line,
             f.abs_ship_qty,
             f.abs_inv_nbr,
             f.abs_par_id,
             f.abs_order,
             a.sod_list_pr,
             IFNULL(f.abs_ship_qty * a.sod_list_pr, 0) AS ext,
             a.sod_acct,
             a.sod_type,
             c.so_rmks
      FROM sod_det a
      LEFT JOIN (
        SELECT pt_part, MAX(pt_desc1) AS pt_desc1, MAX(pt_desc2) AS pt_desc2, MAX(pt_routing) AS pt_routing
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) b ON b.pt_part = a.sod_part
      LEFT JOIN (
        SELECT so_nbr, so_cust, so_ord_date, so_ship, so_bol, so_cmtindx, so_rmks
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
               SUM(a.abs_ship_qty) AS abs_ship_qty,
               a.abs_inv_nbr,
               SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)) AS abs_par_id,
               a.abs_order
        FROM abs_mstr a
        WHERE a.abs_domain = 'EYE'
        GROUP BY a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
                 a.abs_inv_nbr, SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)), a.abs_order
      ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
      WHERE sod_domain = 'EYE'
        AND f.abs_shp_date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND f.abs_ship_qty > 0
      ORDER BY a.sod_due_date ASC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getShippedOrdersChartData(dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT SUM(f.abs_ship_qty * a.sod_list_pr) AS shipped_qty,
             f.abs_shp_date,
             CASE WHEN UPPER(c.so_cust) IN ('BALTEC','AMEGAM','INTGAM','ATI','EVIGAM')
                  THEN UPPER(c.so_cust) ELSE 'Other' END AS so_cust,
             MONTH(f.abs_shp_date) AS month,
             YEAR(f.abs_shp_date) AS year
      FROM sod_det a
      LEFT JOIN (
        SELECT so_nbr, so_cust
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT abs_shipto, abs_shp_date, abs_item, abs_line,
               SUM(abs_ship_qty) AS abs_ship_qty,
               abs_inv_nbr, abs_par_id, abs_order
        FROM abs_mstr
        WHERE abs_domain = 'EYE'
          AND abs_ship_qty > 0
        GROUP BY abs_shipto, abs_shp_date, abs_item, abs_line, abs_inv_nbr, abs_par_id, abs_order
      ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
      WHERE sod_domain = 'EYE'
        AND f.abs_shp_date BETWEEN '${dateFrom}' AND '${dateTo}'
      GROUP BY f.abs_shp_date,
               CASE WHEN UPPER(c.so_cust) IN ('BALTEC','AMEGAM','INTGAM','ATI','EVIGAM')
                    THEN UPPER(c.so_cust) ELSE 'Other' END
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getOneSkuLocationReport(): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT CAST(a.ld_part AS CHAR(25)) AS ld_part,
             a.ld_date,
             a.ld_status,
             a.ld_loc,
             CAST(a.ld_qty_oh AS NUMERIC(36,2)) AS ld_qty_oh,
             CAST(a.ld_qty_all AS NUMERIC(36,2)) AS ld_qty_all,
             b.pt_desc1 || ' ' || b.pt_desc2 AS fullDesc,
             CAST(d.sct_cst_tot * a.ld_qty_oh AS NUMERIC(36,2)) AS extcost,
             CAST(d.sct_cst_tot AS NUMERIC(36,2)) AS sct_cst_tot,
             e.total_items_in_location
      FROM ld_det a
      LEFT JOIN (
        SELECT pt_part, MAX(pt_desc1) AS pt_desc1, MAX(pt_desc2) AS pt_desc2
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) b ON b.pt_part = CAST(a.ld_loc AS CHAR(25))
      LEFT JOIN (
        SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = 'EYE'
          AND sct_site = 'EYE01'
        GROUP BY sct_part
      ) d ON CAST(a.ld_part AS CHAR(25)) = d.sct_part
      LEFT JOIN (
        SELECT COUNT(ld_part) AS total_items_in_location, ld_loc
        FROM ld_det
        WHERE ld_domain = 'EYE'
        GROUP BY ld_loc
      ) e ON e.ld_loc = a.ld_loc
      WHERE a.ld_domain = 'EYE'
        AND a.ld_qty_oh > 0
        AND e.total_items_in_location > 1
      ORDER BY CAST(a.ld_loc AS CHAR(25)) ASC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getInventoryValuation(site: string): Promise<Record<string, unknown>[]> {
    const sql = this.buildInventoryValuationSql(site);
    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  private buildInventoryValuationSql(site: string): string {
    const locationFilters = {
      All: {
        inSite: 'EYE01',
        inJoin: 'LEFT JOIN',
        inventoryJoin: `
          LEFT JOIN (
            SELECT a.ld_part,
                   SUM(ld_qty_oh) AS onHandQty
            FROM ld_det a
            WHERE a.ld_domain = 'EYE'
              AND a.ld_qty_oh > 0
            GROUP BY a.ld_part
          ) c ON c.ld_part = a.pt_part
        `,
        podSiteClause: '',
        woJoinSiteClause: '',
        wodSiteClause: '',
      },
      JX01: {
        inSite: 'JX',
        inJoin: 'JOIN',
        inventoryJoin: `
          JOIN (
            SELECT a.ld_part,
                   SUM(ld_qty_oh) AS onHandQty
            FROM ld_det a
            WHERE a.ld_domain = 'EYE'
              AND a.ld_site = 'JX'
              AND a.ld_qty_oh > 0
            GROUP BY a.ld_part
          ) c ON c.ld_part = a.pt_part
        `,
        podSiteClause: '',
        woJoinSiteClause: " AND wo_site = 'JX'",
        wodSiteClause: '',
      },
      RMLV: {
        inSite: 'EYE01',
        inJoin: 'LEFT JOIN',
        inventoryJoin: `
          JOIN (
            SELECT a.ld_part,
                   SUM(ld_qty_oh) AS onHandQty
            FROM ld_det a
            JOIN (
              SELECT loc_loc
              FROM loc_mstr
              WHERE loc_domain = 'EYE'
                AND loc_type NOT IN ('FG', 'SS')
              GROUP BY loc_loc
            ) cc ON cc.loc_loc = a.ld_loc
            WHERE a.ld_domain = 'EYE'
              AND ld_site = 'EYE01'
              AND a.ld_qty_oh > 0
            GROUP BY a.ld_part
          ) c ON c.ld_part = a.pt_part
        `,
        podSiteClause: " AND pod_site = 'EYE01'",
        woJoinSiteClause: " AND wo_site = 'EYE01'",
        wodSiteClause: " AND wod_site = 'EYE01'",
      },
      FGLV: {
        inSite: 'EYE01',
        inJoin: 'LEFT JOIN',
        inventoryJoin: `
          JOIN (
            SELECT a.ld_part,
                   SUM(ld_qty_oh) AS onHandQty
            FROM ld_det a
            JOIN (
              SELECT loc_loc
              FROM loc_mstr
              WHERE loc_domain = 'EYE'
                AND loc_type = 'FG'
              GROUP BY loc_loc
            ) cc ON cc.loc_loc = a.ld_loc
            WHERE a.ld_domain = 'EYE'
              AND a.ld_qty_oh > 0
            GROUP BY a.ld_part
          ) c ON c.ld_part = a.pt_part
        `,
        podSiteClause: " AND pod_site = 'EYE01'",
        woJoinSiteClause: " AND wo_site = 'EYE01'",
        wodSiteClause: '',
      },
    } as const;

    const selected = locationFilters[site as keyof typeof locationFilters] ?? locationFilters.All;

    return `
      SELECT pt_part,
             in_avg_iss,
             pt_abc,
             sct_cst_tot,
             inventory_turns,
             average_usage_value,
             cp_cust,
             pt_status,
             pt_sfty_stk,
             pt_price,
             pt_part_type,
             onHandQty,
             oh_value,
             openPoQty,
             openpoqtycount,
             last_due_date,
             orderedQty,
             full_desc,
             pt_added,
             pt_avg_int,
             pl_desc,
             pl_inv_acct,
             open_balance,
             total_lines,
             wod_qty_open,
             sct_cst_tot,
             pt_iss_pol,
             pt_buyer,
             pt_pm_code,
             pt_um,
             pl_prod_line,
             is_coi,
             in_iss_date
      FROM (
        SELECT a.pt_part,
               in_avg_iss,
               in_avg_iss * sct_cst_tot AS in_avg_iss_value,
               pt_abc,
               cp_cust,
               pt_status,
               pt_sfty_stk,
               pt_price,
               pt_part_type,
               sct_cst_tot,
               CAST(CASE WHEN onHandQty * sct_cst_tot > 0
                         THEN ((in_avg_iss * sct_cst_tot) / (onHandQty * sct_cst_tot)) * 365
                         ELSE 0 END AS DECIMAL(16,1)) AS inventory_turns,
               (in_avg_iss * sct_cst_tot) AS average_usage_value,
               onHandQty,
               openPoQty,
               openpoqtycount,
               last_due_date,
               orderedQty,
               pt_desc1 || ' ' || pt_desc2 AS full_desc,
               pt_added,
               pt_avg_int,
               pl_desc,
               pl_inv_acct,
               open_balance,
               total_lines,
               wod_qty_open,
               CASE WHEN pt_iss_pol = 1 THEN 'Yes' ELSE 'No' END AS pt_iss_pol,
               pt_buyer,
               pt_pm_code,
               pt_um,
               onHandQty * sct_cst_tot AS oh_value,
               pl_prod_line,
               b.in_iss_date,
               CASE WHEN (RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N')
                    THEN '-' ELSE 'COI' END AS is_coi
        FROM pt_mstr a
        ${selected.inJoin} (
          SELECT in_part,
                 MAX(in_avg_iss) AS in_avg_iss,
                 MAX(in_iss_date) AS in_iss_date
          FROM in_mstr
          WHERE in_domain = 'EYE'
            AND in_site = '${selected.inSite}'
          GROUP BY in_part
        ) b ON b.in_part = a.pt_part
        LEFT JOIN (
          SELECT sct_part,
                 MAX(sct_cst_tot) AS sct_cst_tot
          FROM sct_det
          WHERE sct_sim = 'Standard'
            AND sct_domain = 'EYE'
            AND sct_site = 'EYE01'
          GROUP BY sct_part
        ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part
        LEFT JOIN (
          SELECT MAX(cp_cust) AS cp_cust,
                 cp_part
          FROM cp_mstr
          WHERE cp_domain = 'EYE'
          GROUP BY cp_part
        ) cust ON cust.cp_part = a.pt_part
        ${selected.inventoryJoin}
        LEFT JOIN (
          SELECT pod_part,
                 SUM((pod_qty_ord) * pod_std_cost) AS orderedQty,
                 SUM(CASE WHEN a.pod_status != 'c' THEN ((pod_qty_ord - pod_qty_rcvd) * pod_std_cost) ELSE 0 END) AS openPoQty,
                 SUM(CASE WHEN a.pod_status != 'c' THEN pod_qty_ord - pod_qty_rcvd ELSE 0 END) AS openpoqtycount,
                 MAX(CASE WHEN a.pod_status = 'c' THEN pod_due_date END) AS last_due_date
          FROM pod_det a
          WHERE a.pod_domain = 'EYE'${selected.podSiteClause}
          GROUP BY pod_part
        ) e ON e.pod_part = a.pt_part
        LEFT JOIN (
          SELECT MAX(pl_prod_line) AS pl_prod_line,
                 MAX(pl_inv_acct) AS pl_inv_acct,
                 pl_desc AS pl_desc
          FROM pl_mstr a
          WHERE pl_domain = 'EYE'
            AND pl_prod_line != ''
          GROUP BY pl_desc
        ) pl ON pl.pl_prod_line = a.pt_prod_line
        LEFT JOIN (
          SELECT COUNT(CASE WHEN wod_qty_req - wod_qty_iss = 0 THEN 1 ELSE 0 END) AS wod_qty_open,
                 wod_part
          FROM wod_det a
          JOIN wo_mstr b ON a.wod_nbr = b.wo_nbr
            AND wo_domain = 'EYE'
            AND wo_due_date > '2019-07-01'
            AND wo_status != 'c'${selected.woJoinSiteClause}
          WHERE wod_domain = 'EYE'
            AND wod_qty_req != wod_qty_iss
            AND wod_status != 'c'${selected.wodSiteClause}
          GROUP BY wod_part
        ) g ON g.wod_part = a.pt_part
        LEFT JOIN (
          SELECT sod_part,
                 SUM((sod_qty_ord - sod_qty_ship) * sod_price) AS open_balance,
                 COUNT(sod_part) AS total_lines
          FROM sod_det
          WHERE sod_domain = 'EYE'
            AND sod_qty_ord - sod_qty_ship > 0
          GROUP BY sod_part
        ) so ON so.sod_part = a.pt_part
        WHERE pt_domain = 'EYE'
      ) a
      WHERE is_coi <> 'COI'
    `;
  }

  async getItemConsolidationQad(domain = 'EYE'): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT CAST(a.ld_part AS CHAR(25)) AS ld_part,
             COUNT(ld_loc) AS items_in_location,
             SUM(CAST(a.ld_qty_oh AS NUMERIC(36,2))) AS ld_qty_oh,
             SUM(CAST(a.ld_qty_all AS NUMERIC(36,2))) AS ld_qty_all,
             SUM(CAST(d.sct_cst_tot * a.ld_qty_oh AS NUMERIC(36,2))) AS extcost,
             SUM(CAST(d.sct_cst_tot * a.ld_qty_oh AS NUMERIC(36,2))) AS sct_cst_tot
      FROM ld_det a
      LEFT JOIN (
        SELECT pt_part, MAX(pt_desc1) AS pt_desc1, MAX(pt_desc2) AS pt_desc2
        FROM pt_mstr
        WHERE pt_domain = '${domain}'
        GROUP BY pt_part
      ) b ON b.pt_part = a.ld_part
      LEFT JOIN (
        SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = '${domain}'
          AND sct_site = 'EYE01'
        GROUP BY sct_part
      ) d ON a.ld_part = d.sct_part
      WHERE a.ld_domain = '${domain}'
        AND CAST(a.ld_part AS CHAR(25)) NOT LIKE '*U'
      GROUP BY CAST(a.ld_part AS CHAR(25))
      HAVING COUNT(ld_loc) > 1
      ORDER BY COUNT(ld_loc) DESC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getItemConsolidationMysql(): Promise<Record<string, unknown>[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT * FROM eyefidb.item_consolidation`,
      [],
    );
  }

  async getOtdReportDetails(dateFrom: string, dateTo: string, displayCustomers?: string): Promise<Record<string, unknown>[]> {
    let customerFilter = '';
    if (displayCustomers && displayCustomers !== 'Show All' && displayCustomers !== 'false' && displayCustomers !== 'undefined') {
      customerFilter = `AND c.so_cust = '${displayCustomers.replace(/'/g, "''")}'`;
    }

    const sql = `
      SELECT c.so_cust,
             a.sod_nbr AS so_nbr,
             a.sod_line,
             a.sod_per_date,
             f.abs_shp_date AS last_shipped_on,
             CAST(a.sod_qty_ord AS DECIMAL(16,2)) AS sod_qty_ord,
             IFNULL(CAST(f.abs_ship_qty AS DECIMAL(16,2)), 0) AS abs_ship_qty,
             IFNULL(a.sod_per_date - f.abs_shp_date, a.sod_per_date - CURDATE()) AS diff,
             WEEK(a.sod_per_date) AS week,
             YEAR(a.sod_per_date) AS year,
             MONTH(a.sod_per_date) AS month,
             CASE
               WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 'Yes'
               WHEN f.abs_shp_date IS NULL THEN 'Yes'
               WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 'Yes'
               ELSE 'No'
             END AS is_late,
             CASE WHEN a.sod_qty_ord - f.abs_ship_qty > 0 THEN 'Shipped Partial' END AS shipped_partial
      FROM sod_det a
      JOIN (
        SELECT so_nbr, so_cust
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
               SUM(a.abs_ship_qty) AS abs_ship_qty,
               a.abs_inv_nbr,
               SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)) AS abs_par_id,
               a.abs_order
        FROM abs_mstr a
        WHERE a.abs_domain = 'EYE'
        GROUP BY a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
                 a.abs_inv_nbr, SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)), a.abs_order
      ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
      WHERE a.sod_per_date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND sod_domain = 'EYE'
        ${customerFilter}
      ORDER BY c.so_cust, a.sod_per_date ASC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getOtdReportSummary(dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT c.so_cust AS label,
             COUNT(*) AS total_lines,
             SUM(CASE
               WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
               WHEN f.abs_shp_date IS NULL THEN 0
               WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
               ELSE 1
             END) AS total_shipped_on_time,
             COUNT(*) - SUM(CASE
               WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
               WHEN f.abs_shp_date IS NULL THEN 0
               WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
               ELSE 1
             END) AS total_shipped_late,
             CAST(CASE WHEN SUM(CASE
               WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
               WHEN f.abs_shp_date IS NULL THEN 0
               WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
               ELSE 1
             END) > 0
             THEN (SUM(CASE
               WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
               WHEN f.abs_shp_date IS NULL THEN 0
               WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
               ELSE 1
             END) / COUNT(*)) * 100 ELSE 0 END AS DECIMAL(16,2)) AS value
      FROM sod_det a
      JOIN (
        SELECT so_nbr, so_cust
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
               SUM(a.abs_ship_qty) AS abs_ship_qty,
               a.abs_inv_nbr,
               SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)) AS abs_par_id,
               a.abs_order
        FROM abs_mstr a
        WHERE a.abs_domain = 'EYE'
        GROUP BY a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
                 a.abs_inv_nbr, SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)), a.abs_order
      ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
      WHERE a.sod_per_date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND sod_domain = 'EYE'
      GROUP BY c.so_cust
      ORDER BY CAST(CASE WHEN SUM(CASE
        WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
        WHEN f.abs_shp_date IS NULL THEN 0
        WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
        ELSE 1
      END) > 0
      THEN (SUM(CASE
        WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
        WHEN f.abs_shp_date IS NULL THEN 0
        WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
        ELSE 1
      END) / COUNT(*)) * 100 ELSE 0 END AS DECIMAL(16,2)) DESC
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getOtdReportChartData(dateFrom: string, dateTo: string, displayCustomers?: string): Promise<Record<string, unknown>[]> {
    let customerFilter = '';
    if (displayCustomers && displayCustomers !== 'Show All' && displayCustomers !== 'false' && displayCustomers !== 'undefined') {
      customerFilter = `WHERE so_cust = '${displayCustomers.replace(/'/g, "''")}'`;
    }

    const sql = `
      SELECT total_lines,
             total_shipped_on_time,
             (total_lines - total_shipped_on_time) AS total_shipped_late,
             CAST(CASE WHEN total_shipped_on_time > 0
                       THEN (total_shipped_on_time / total_lines) * 100 ELSE 0
                  END AS DECIMAL(16,2)) AS value,
             so_cust AS label,
             sod_per_date,
             so_cust
      FROM (
        SELECT COUNT(*) AS total_lines,
               SUM(CASE
                 WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
                 WHEN f.abs_shp_date IS NULL THEN 0
                 WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
                 ELSE 1
               END) AS total_shipped_on_time,
               a.sod_per_date,
               c.so_cust
        FROM sod_det a
        JOIN (
          SELECT so_nbr, so_cust
          FROM so_mstr
          WHERE so_domain = 'EYE'
        ) c ON c.so_nbr = a.sod_nbr
        LEFT JOIN (
          SELECT a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
                 SUM(a.abs_ship_qty) AS abs_ship_qty,
                 a.abs_inv_nbr,
                 SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)) AS abs_par_id,
                 a.abs_order
          FROM abs_mstr a
          WHERE a.abs_domain = 'EYE'
          GROUP BY a.abs_shipto, a.abs_shp_date, a.abs_item, a.abs_line,
                   a.abs_inv_nbr, SUBSTRING(abs_par_id, 2, LENGTH(abs_par_id)), a.abs_order
        ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
        WHERE a.sod_per_date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND sod_domain = 'EYE'
        GROUP BY a.sod_per_date, c.so_cust
        ORDER BY CAST(CASE WHEN SUM(CASE
          WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
          WHEN f.abs_shp_date IS NULL THEN 0
          WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
          ELSE 1
        END) > 0
        THEN (SUM(CASE
          WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 0
          WHEN f.abs_shp_date IS NULL THEN 0
          WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 0
          ELSE 1
        END) / COUNT(*)) * 100 ELSE 0 END AS DECIMAL(16,2)) DESC
      ) inner_q
      ${customerFilter}
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getOtdReportV1Details(dateFrom: string, dateTo: string, displayCustomers?: string): Promise<any[]> {
    const showAll = !displayCustomers || displayCustomers === 'Show All' || displayCustomers === 'false' || displayCustomers === 'undefined';
    const customerClause = showAll ? '' : `AND customer = '${displayCustomers.replace(/'/g, "''")}'`;

    const sql = `
      SELECT customer AS so_cust,
             so_nbr,
             line_nbr AS sod_line,
             performance_date AS sod_per_date,
             last_shipped_on,
             qty_ordered AS sod_qty_ord,
             shipped_qty AS abs_ship_qty,
             difference AS diff,
             week,
             year,
             CONCAT(so_nbr, '-', line_nbr) AS soAndLine,
             month,
             CASE
               WHEN performance_date - last_shipped_on < 0 AND performance_date < CURDATE() THEN 'Yes'
               WHEN last_shipped_on IS NULL THEN 'Yes'
               WHEN performance_date < CURDATE() AND qty_ordered != shipped_qty THEN 'Yes'
               ELSE 'No'
             END AS is_late,
             shipped_partial
      FROM eyefidb.on_time_delivery
      WHERE last_shipped_on BETWEEN ? AND ?
        AND so_nbr NOT LIKE 'FS%'
        AND last_shipped_on IS NOT NULL
        ${customerClause}
      ORDER BY customer, last_shipped_on ASC
    `;

    return this.mysqlService.query(sql, [dateFrom, dateTo]);
  }

  async getOtdReportV1Summary(dateFrom: string, dateTo: string): Promise<any[]> {
    const sql = `
      SELECT customer AS label,
             COUNT(*) AS total_lines,
             SUM(CASE
               WHEN performance_date - last_shipped_on < 0 AND performance_date < CURDATE() THEN 0
               WHEN last_shipped_on IS NULL THEN 0
               WHEN performance_date < CURDATE() AND qty_ordered != shipped_qty THEN 0
               ELSE 1
             END) AS total_shipped_on_time,
             CASE WHEN SUM(CASE
               WHEN performance_date - last_shipped_on < 0 AND performance_date < CURDATE() THEN 0
               WHEN last_shipped_on IS NULL THEN 0
               WHEN performance_date < CURDATE() AND qty_ordered != shipped_qty THEN 0
               ELSE 1
             END) > 0
             THEN (SUM(CASE
               WHEN performance_date - last_shipped_on < 0 AND performance_date < CURDATE() THEN 0
               WHEN last_shipped_on IS NULL THEN 0
               WHEN performance_date < CURDATE() AND qty_ordered != shipped_qty THEN 0
               ELSE 1
             END) / COUNT(*)) * 100 ELSE 0 END AS value
      FROM eyefidb.on_time_delivery
      WHERE last_shipped_on BETWEEN ? AND ?
        AND so_nbr NOT LIKE 'FS%'
        AND last_shipped_on IS NOT NULL
      GROUP BY customer
      ORDER BY CONVERT(CASE WHEN SUM(CASE
        WHEN performance_date - last_shipped_on < 0 AND performance_date < CURDATE() THEN 0
        WHEN last_shipped_on IS NULL THEN 0
        WHEN performance_date < CURDATE() AND qty_ordered != shipped_qty THEN 0
        ELSE 1
      END) > 0
      THEN (SUM(CASE
        WHEN performance_date - last_shipped_on < 0 AND performance_date < CURDATE() THEN 0
        WHEN last_shipped_on IS NULL THEN 0
        WHEN performance_date < CURDATE() AND qty_ordered != shipped_qty THEN 0
        ELSE 1
      END) / COUNT(*)) * 100 ELSE 0 END, UNSIGNED INTEGER) DESC
    `;

    return this.mysqlService.query(sql, [dateFrom, dateTo]);
  }

  async getOtdReportV1WorkOrderOwners(soLines: string[]): Promise<any[]> {
    if (!soLines.length) return [];
    const placeholders = soLines.map(() => '?').join(',');
    const sql = `SELECT * FROM eyefidb.workOrderOwner WHERE so IN (${placeholders})`;
    return this.mysqlService.query(sql, soLines);
  }

  async getOtdReportV1SodParts(soNbrs: string[]): Promise<Record<string, unknown>[]> {
    if (!soNbrs.length) return [];
    const inList = soNbrs.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
    const sql = `
      SELECT sod_nbr, sod_line, sod_part
      FROM sod_det
      WHERE sod_nbr IN (${inList})
        AND sod_domain = 'EYE'
    `;
    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async refreshOtdData(): Promise<{ updated: number }> {
    const sql = `
      SELECT a.sod_nbr AS so_nbr,
             a.sod_line AS line_nbr,
             c.so_cust AS customer,
             a.sod_per_date AS performance_date,
             f.abs_shp_date AS last_shipped_on,
             CAST(a.sod_qty_ord AS DECIMAL(16,2)) AS qty_ordered,
             IFNULL(CAST(f.abs_ship_qty AS DECIMAL(16,2)), 0) AS shipped_qty,
             IFNULL(a.sod_per_date - f.abs_shp_date, a.sod_per_date - CURDATE()) AS difference,
             WEEK(a.sod_per_date) AS week,
             YEAR(a.sod_per_date) AS year,
             MONTH(a.sod_per_date) AS month,
             CASE WHEN a.sod_qty_ord - IFNULL(f.abs_ship_qty, 0) > 0 THEN 'Shipped Partial' ELSE NULL END AS shipped_partial
      FROM sod_det a
      JOIN (
        SELECT so_nbr, so_cust
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT MAX(abs_shp_date) AS abs_shp_date, abs_line, SUM(abs_ship_qty) AS abs_ship_qty, abs_order
        FROM abs_mstr
        WHERE abs_domain = 'EYE'
          AND abs_ship_qty > 0
        GROUP BY abs_line, abs_order
      ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
      WHERE sod_domain = 'EYE'
        AND f.abs_shp_date IS NOT NULL
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    if (!rows.length) return { updated: 0 };

    await this.mysqlService.execute('TRUNCATE TABLE eyefidb.on_time_delivery', []);

    const chunkSize = 500;
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const values = chunk.flatMap((r) => [
        r['so_nbr'], r['line_nbr'], r['customer'], r['performance_date'],
        r['last_shipped_on'], r['qty_ordered'], r['shipped_qty'], r['difference'],
        r['week'], r['year'], r['month'], r['shipped_partial'] ?? null,
      ]);
      await this.mysqlService.execute(
        `INSERT INTO eyefidb.on_time_delivery
           (so_nbr, line_nbr, customer, performance_date, last_shipped_on,
            qty_ordered, shipped_qty, difference, week, year, month, shipped_partial)
         VALUES ${placeholders}`,
        values,
      );
      totalInserted += chunk.length;
    }

    return { updated: totalInserted };
  }

  async getOtdReportReasonChart(dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT SUM(total_lines) AS total_lines,
             CASE WHEN ROW_NUMBER <= 5 THEN label ELSE 'Other' END AS label
      FROM (
        SELECT b.lateReasonCode AS label,
               COUNT(*) AS total_lines,
               @curRow := @curRow + 1 AS row_number
        FROM eyefidb.on_time_delivery a
        LEFT JOIN eyefidb.workOrderOwner b ON b.so = CONCAT(a.so_nbr, '-', a.line_nbr)
        WHERE a.last_shipped_on BETWEEN ? AND ?
          AND a.so_nbr NOT LIKE 'FS%'
          AND a.last_shipped_on IS NOT NULL
          AND b.lateReasonCode <> ''
        GROUP BY b.lateReasonCode
      ) ranked
      CROSS JOIN (SELECT @curRow := 0) r
      GROUP BY CASE WHEN ROW_NUMBER <= 5 THEN label ELSE 'Other' END
    `;

    const result = await this.mysqlService.query(sql, [dateFrom, dateTo]);
    return (result as any) || [];
  }
}
