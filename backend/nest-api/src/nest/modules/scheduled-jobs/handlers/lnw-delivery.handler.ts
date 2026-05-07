import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface LnwRow extends RowDataPacket {
  sod_nbr: string;
  sod_contr_id: string;
  sod_part: string;
  sod_custpart: string;
  openqty: number;
  fulldesc: string;
  cmt_cmmt: string;
}

interface LnwEmailRow {
  sodNbr: string;
  sodContrId: string;
  sodPart: string;
  sodCustPart: string;
  openQty: string;
  fullDesc: string;
  comments: string;
}

interface LnwEmailGroup {
  date: string;
  hasRows: boolean;
  rows: LnwEmailRow[];
}

@Injectable()
export class LnwDeliveryHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(LnwDeliveryHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const next3Weekdays = this.getNext3Weekdays();

      const grouped = [] as Array<{ date: string; rows: LnwRow[] }>;
      for (const dueDate of next3Weekdays) {
        const rows = await this.qadOdbcService.queryWithParams<LnwRow[]>(`
          SELECT
            a.sod_nbr,
            a.sod_part,
            a.sod_contr_id,
            CASE WHEN a.sod_custpart = '' THEN a.sod_part ELSE a.sod_custpart END AS sod_custpart,
            CAST(a.sod_qty_ord-a.sod_qty_ship AS NUMERIC(36,0)) AS openQty,
            b.fullDesc,
            f.cmt_cmmt
          FROM sod_det a
          LEFT JOIN (
            SELECT
              pt_part,
              MAX(CONCAT(pt_desc1, pt_desc2)) AS fullDesc
            FROM pt_mstr
            WHERE pt_domain = 'EYE'
            GROUP BY pt_part
          ) b ON b.pt_part = a.sod_part
          LEFT JOIN (
            SELECT cmt_cmmt, cmt_indx
            FROM cmt_det
            WHERE cmt_domain = 'EYE'
          ) f ON f.cmt_indx = a.sod_cmtindx
          JOIN so_mstr g ON g.so_nbr = a.sod_nbr
            AND g.so_domain = 'EYE'
            AND g.so_cust = 'BALTEC'
            AND g.so_ship IN ('NV.PILOT', 'NV.PECOS')
            AND a.sod_order_category != 'JIT'
          WHERE a.sod_domain = 'EYE'
            AND a.sod_due_date = ?
            AND CAST(a.sod_qty_ord-a.sod_qty_ship AS NUMERIC(36,0)) > 0
            AND a.sod_prodline NOT IN ('TAR', 'FEES')
        `, [dueDate], { keyCase: 'lower' });
        grouped.push({ date: dueDate, rows });
      }

      const total = grouped.reduce((sum, g) => sum + g.rows.length, 0);

      if (total > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'lnw_shipping_report_notification' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        if (to.length > 0) {
          const html = this.emailTemplateService.render('lnw-delivery', {
            grouped: this.toEmailGroups(grouped),
          });
          await this.emailService.sendMail({
            to,
            subject: `LNW DELIVERY ${next3Weekdays.join(', ')}`,
            html,
          });
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] lnw-delivery -> ${total} rows in ${durationMs}ms`);

      return {
        id: 'lnw-delivery',
        name: 'LNW Delivery Schedule',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${total} LNW delivery lines processed.`,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'success',
          triggerType: trigger,
          errorMessage: null,
        },
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startedAtMs;
      const message = error instanceof Error ? error.message : String(error);
      const odbcErrors = (error as Record<string, unknown>)?.odbcErrors;
      this.logger.error(`[${trigger}] lnw-delivery failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] lnw-delivery ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'lnw-delivery',
        name: 'LNW Delivery Schedule',
        trigger,
        ok: false,
        statusCode: 500,
        durationMs,
        message,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'failure',
          triggerType: trigger,
          errorMessage: message,
        },
      };
    }
  }

  private getNext3Weekdays(): string[] {
    const dates: string[] = [];
    let i = 1;
    while (dates.length < 3) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(d.toISOString().slice(0, 10));
      }
      i++;
    }
    return dates;
  }

  private toEmailGroups(grouped: Array<{ date: string; rows: LnwRow[] }>): LnwEmailGroup[] {
    return grouped.map((group) => ({
      date: group.date,
      hasRows: group.rows.length > 0,
      rows: group.rows.map((row) => ({
        sodNbr: String(row.sod_nbr || ''),
        sodContrId: String(row.sod_contr_id || ''),
        sodPart: String(row.sod_part || ''),
        sodCustPart: String(row.sod_custpart || ''),
        openQty: String(row.openqty ?? 0),
        fullDesc: String(row.fulldesc || ''),
        comments: String(row.cmt_cmmt || '').replace(/;/g, ''),
      })),
    }));
  }
}
