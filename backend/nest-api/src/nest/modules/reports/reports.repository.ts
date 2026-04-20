import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

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

@Injectable()
export class ReportsRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
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
}
