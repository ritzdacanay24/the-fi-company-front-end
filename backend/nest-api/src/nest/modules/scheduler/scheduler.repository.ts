import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface SchedulerRecord extends RowDataPacket {
  id: number;
  request_id: number | null;
  created_date: Date | null;
  created_by: number | null;
  group_id: number | null;
  connecting_jobs: string | null;
  turnover_fsid: number | null;
  request_date: Date | null;
  start_time: string | null;
  requested_by: string | null;
  status: string | null;
  sales_order_number: string | null;
  service_type: string | null;
  customer: string | null;
  out_of_state: string | null;
  sign_theme: string | null;
  sign_type: string | null;
  platform: string | null;
  comments: string | null;
  notes: string | null;
  vendor_cost: string | null;
  invoice: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  invoice_notes: string | null;
  vendor_inv_number: string | null;
  billable_flat_rate_or_po: string | null;
  paper_work_location: string | null;
  acc_status: string | null;
  contractor_inv_sent_to_ap: string | null;
  period: string | null;
  billable: string | null;
  active: number | null;
  co_number: string | null;
  customer_cancelled: string | null;
  cancellation_comments: string | null;
  cancelled_type: string | null;
  mark_up_percent: number | null;
  ef_hourly_rate: string | null;
  ef_overtime_hourly_rate: string | null;
  compliance_license_notes: string | null;
  published: number | null;
  property_id: number | null;
  queue: string | null;
  queus_status: string | null;
  title: string | null;
  schedule_later: number | null;
  non_billable_code: number | null;
  property: string | null;
  fs_lat: string | null;
  fs_lon: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  property_phone: string | null;
  sign_responsibility: string | null;
  fs_calendar_id: number | null;
  onsite_customer_name: string | null;
  onsite_customer_phone_number: string | null;
  licensing_required: string | null;
  ceiling_height: string | null;
  bolt_to_floor: string | null;
  sign_jacks: string | null;
  site_survey_requested: string | null;
  per_tech_rate: number | null;
  per_tech_rate_ot: number | null;
  original_request_date: string | null;
  notice_email_date: Date | null;
}

const ALLOWED_COLUMNS = new Set([
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

@Injectable()
export class SchedulerRepository extends BaseRepository<SchedulerRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_scheduler', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(): Promise<SchedulerRecord[]> {
    return this.find();
  }

  async getByDateRange(dateFrom: string, dateTo: string): Promise<SchedulerRecord[]> {
    return this.rawQuery<SchedulerRecord>(
      `SELECT * FROM eyefidb.fs_scheduler 
       WHERE DATE(request_date) BETWEEN ? AND ? 
       ORDER BY request_date ASC`,
      [dateFrom, dateTo],
    );
  }

  async searchByJob(text: string): Promise<any[]> {
    return this.rawQuery(
      `SELECT a.*, b.id AS workOrderId
       FROM eyefidb.fs_scheduler a
       LEFT JOIN eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id
       WHERE a.id = ? OR a.property LIKE ?
       ORDER BY a.request_date DESC`,
      [text, `%${text}%`],
    );
  }

  async getConnectingJobsByTech(tech: string, dateFrom: string, dateTo: string): Promise<SchedulerRecord[]> {
    return this.rawQuery<SchedulerRecord>(
      `SELECT * FROM eyefidb.fs_scheduler 
       WHERE DATE(request_date) BETWEEN ? AND ? 
       AND JSON_CONTAINS(connecting_jobs, JSON_QUOTE(?))
       ORDER BY request_date ASC`,
      [dateFrom, dateTo, tech],
    );
  }

  async getConnectingJobs(groupId: number): Promise<SchedulerRecord[]> {
    return this.rawQuery<SchedulerRecord>(
      `SELECT * FROM eyefidb.fs_scheduler WHERE group_id = ? ORDER BY request_date ASC`,
      [groupId],
    );
  }

  async getGroupJobs(groupId: number): Promise<SchedulerRecord[]> {
    return this.rawQuery<SchedulerRecord>(
      `SELECT * FROM eyefidb.fs_scheduler WHERE group_id = ? ORDER BY request_date ASC`,
      [groupId],
    );
  }

  async getAssignments(user: string, dateFrom: string, dateTo: string): Promise<any[]> {
    return this.rawQuery(
      `SELECT * FROM eyefidb.fs_scheduler 
       WHERE DATE(request_date) BETWEEN ? AND ? 
       ORDER BY request_date ASC`,
      [dateFrom, dateTo],
    );
  }

  async getJobByUser(user: string): Promise<SchedulerRecord[]> {
    return this.rawQuery<SchedulerRecord>(
      `SELECT * FROM eyefidb.fs_scheduler WHERE requested_by = ? ORDER BY request_date ASC`,
      [user],
    );
  }

  async getSchedulerByDateRange(dateFrom: string, dateTo: string): Promise<SchedulerRecord[]> {
    return this.rawQuery<SchedulerRecord>(
      `SELECT * FROM eyefidb.fs_scheduler 
       WHERE DATE(request_date) BETWEEN ? AND ? 
       ORDER BY request_date ASC`,
      [dateFrom, dateTo],
    );
  }

  async getCalendar(dateFrom: string, dateTo: string): Promise<any[]> {
    return this.rawQuery(
      `SELECT 
        a.request_date AS start,
        a.request_date AS end,
        a.id,
        CONCAT(IFNULL(CONCAT(a.customer, ' ', a.property), 'No title'), '-', IFNULL(a.service_type, 'No service')) AS title,
        'JOB' AS type_of_event,
        CASE 
          WHEN a.published = 0 OR a.published IS NULL THEN '#fff'
          WHEN a.sign_responsibility = 'EyeFi' THEN '#00FFFF'
          ELSE f.statusColor
        END AS backgroundColor,
        f.statusColor AS borderColor,
        CASE
          WHEN f.color IS NULL OR a.published = 0 OR a.published IS NULL THEN '#000'
          WHEN a.sign_responsibility = 'EyeFi' THEN '#000'
          ELSE f.color
        END AS textColor,
        a.id AS fs_scheduler_id,
        a.active,
        a.property,
        a.customer,
        a.status,
        b.id AS ticket_id,
        cc.techs,
        a.fs_lat,
        a.fs_lon,
        a.service_type,
        a.acc_status
      FROM eyefidb.fs_scheduler a
      LEFT JOIN eyefidb.fs_scheduler_settings f
        ON f.value = a.status
       AND f.type = 'status'
      LEFT JOIN eyefidb.fs_workOrder b
        ON b.fs_scheduler_id = a.id
      LEFT JOIN (
        SELECT
          GROUP_CONCAT(user SEPARATOR ', ') AS techs,
          fs_det_id
        FROM eyefidb.fs_team
        GROUP BY fs_det_id
      ) cc
        ON cc.fs_det_id = a.id
      WHERE DATE(a.request_date) BETWEEN ? AND ?
        AND (a.schedule_later IS NULL OR a.schedule_later = 0)
        AND a.active = 1

      UNION ALL

      SELECT
        DATE_FORMAT(a.start, '%Y-%m-%d') AS start,
        IFNULL(a.end, 'All Day') AS end,
        a.id,
        CONCAT(IFNULL(a.title, 'No title'), ' - ', IFNULL(a.type, '-')) AS title,
        'EVENT' AS type_of_event,
        a.backgroundColor AS backgroundColor,
        a.backgroundColor AS borderColor,
        a.textColor AS textColor,
        NULL AS fs_scheduler_id,
        a.active,
        NULL AS property,
        NULL AS customer,
        NULL AS status,
        NULL AS ticket_id,
        NULL AS techs,
        NULL AS fs_lat,
        NULL AS fs_lon,
        NULL AS service_type,
        NULL AS acc_status
      FROM eyefidb.companyHoliday a
      WHERE DATE(a.start) BETWEEN ? AND ?
        AND a.active = 1

      ORDER BY start ASC`,
      [dateFrom, dateTo, dateFrom, dateTo],
    );
  }

  async getTechSchedule(dateFrom: string, dateTo: string): Promise<any[]> {
    return this.rawQuery(
      `SELECT * FROM eyefidb.fs_scheduler 
       WHERE DATE(request_date) BETWEEN ? AND ? 
       AND active = 1
       ORDER BY request_date ASC`,
      [dateFrom, dateTo],
    );
  }

  async getMap(dateFrom: string, dateTo: string): Promise<any[]> {
    return this.rawQuery(
      `SELECT * FROM eyefidb.fs_scheduler 
       WHERE DATE(request_date) BETWEEN ? AND ? 
       AND active = 1
       AND fs_lat IS NOT NULL 
       AND fs_lon IS NOT NULL
       ORDER BY request_date ASC`,
      [dateFrom, dateTo],
    );
  }
}
