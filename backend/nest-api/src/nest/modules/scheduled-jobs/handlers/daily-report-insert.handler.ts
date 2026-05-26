import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { DailyReportService } from '@/nest/modules/reports/daily-report.service';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface DailyReportSnapshot extends Record<string, unknown> {
  last_refreshed?: string;
  status?: string;
  shipping_open_overdue_and_due_today_value?: number;
  shipping_open_overdue_and_due_today_lines?: number;
  shipping_total_shipped_value?: number;
  total_shipped_today_lines?: number;
  on_time_delivery_today_percent?: number;
  on_time_delivery_today?: number;
  total_lines_due_today?: number;
  production?: {
    production_routing_20?: {
      due?: {
        due_completed_today?: number;
        due_total?: number;
        due_open?: number;
        total_overdue_orders?: number;
      };
    };
  };
  openBalanceCurrentMonth?: number;
  openLinesForCurrentWeek?: number;
  openLinesToday?: number;
  ops10RoutingCompleted?: number;
  futuerOpenRevenueCurrentMonth?: {
    dateFrom?: string;
    dateTo?: string;
    value?: number;
  };
  getThreeMonthsRevenue?: {
    value?: number;
  };
  onTime?: Array<{
    so_cust?: string;
    shipped_before_or_on_due_date?: number;
    total_lines_today?: number;
    toal_lines_today?: number;
    total_shipped_today?: number;
  }>;
  inventory_value?: number;
  fgLV?: {
    total?: number;
    lessthanone?: number;
    greaterthanorequaltoone?: number;
  };
  jx01?: {
    total?: number;
  };
  transit_total_ext_cost?: number;
  ss?: {
    total?: number;
  };
  reject_total_ext_cost?: number;
  wip?: number;
  eye01?: {
    lessthanone?: number;
    greaterthanorequaltoone?: number;
  };
  all?: {
    lessthanone?: number;
    greaterthanorequaltoone?: number;
  };
  lateReasonCodes?: Array<{
    lateReasonCode?: string;
    value?: number;
  }>;
}

interface DailyReportEmailRow {
  title: string;
  subtitle?: string;
  value: string;
  valueSubtitle?: string;
}

interface DailyReportEmailContext extends Record<string, unknown> {
  reportAsOf: string;
  reportModeLabel: string;
  modeMessage: string;
  summaryRows: DailyReportEmailRow[];
  shippingDetailsTitle: string;
  shippingDetailsRows: Array<{
    customerName: string;
    shippedBeforeOrOnPerformanceDate: number;
    totalNumberOfLinesShippedToday: number;
    otdPercent: string;
  }>;
  inventoryRows: DailyReportEmailRow[];
  inventoryTurnsRows: Array<{
    label: string;
    lessThanOne: string;
    greaterThanOrEqualToOne: string;
  }>;
  lateReasonCodeRows: Array<{
    lateReasonCode: string;
    value: number;
  }>;
}

@Injectable()
export class DailyReportInsertHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(DailyReportInsertHandler.name);

  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const report = await this.dailyReportService.getDailyReport() as DailyReportSnapshot;
      const recipients = await this.scheduledJobRecipientsService.resolveSubscribedEmails(SCHEDULED_JOB_IDS.DAILY_REPORT_INSERT);
      const emailContext = this.buildEmailContext(report);
      const subject = `Daily Report - Live as of ${emailContext.reportAsOf}`;
      const durationMs = Date.now() - startedAtMs;

      if (recipients.length > 0) {
        const html = this.emailTemplateService.render('daily-report-insert', emailContext);

        await this.emailService.sendMail({
          to: recipients,
          scheduledJobId: SCHEDULED_JOB_IDS.DAILY_REPORT_INSERT,
          subject,
          html,
        });

        this.logger.log(`[${trigger}] daily-report-insert -> sent daily report email to ${recipients.length} recipients in ${durationMs}ms`);
      } else {
        this.logger.warn(`[${trigger}] daily-report-insert -> no subscribed recipients configured`);
      }

      return {
        id: SCHEDULED_JOB_IDS.DAILY_REPORT_INSERT,
        name: 'Daily Report Email',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: recipients.length > 0
          ? `Daily report email sent successfully to ${recipients.length} recipient(s).`
          : 'Daily report refreshed successfully, but no subscribed recipients were configured for email delivery.',
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
      this.logger.error(`[${trigger}] daily-report-insert failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] daily-report-insert ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: SCHEDULED_JOB_IDS.DAILY_REPORT_INSERT,
        name: 'Daily Report Email',
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

  private buildEmailContext(report: DailyReportSnapshot): DailyReportEmailContext {
    const reportAsOf = String(report.last_refreshed || new Date().toISOString().replace('T', ' ').slice(0, 19));
    const reportDate = reportAsOf.slice(0, 10);
    const futureRevenue = report.futuerOpenRevenueCurrentMonth || {};
    const productionDue = report.production?.production_routing_20?.due || {};

    return {
      reportAsOf,
      reportModeLabel: 'Live',
      modeMessage: 'Live mode is active. Pulling latest data for today.',
      summaryRows: [
        {
          title: 'Open sales order $',
          subtitle: 'Calculated based on Overdue & Due Today lines',
          value: this.formatCurrency(report.shipping_open_overdue_and_due_today_value),
          valueSubtitle: `(${this.formatInteger(report.shipping_open_overdue_and_due_today_lines)} total open lines)`,
        },
        {
          title: `Lines shipped today $ (${reportDate})`,
          value: this.formatCurrency(report.shipping_total_shipped_value),
          valueSubtitle: `(${this.formatInteger(report.total_shipped_today_lines)} total lines shipped today)`,
        },
        {
          title: `% Shipping OTD (${reportDate})`,
          subtitle: '(Lines shipped before or on performance date / Total lines shipped today)',
          value: this.formatPercent(report.on_time_delivery_today_percent),
          valueSubtitle: `(${this.formatInteger(report.on_time_delivery_today)} of ${this.formatInteger(report.total_lines_due_today)} total lines)`,
        },
        {
          title: `% Production Orders OTD (${reportDate})`,
          subtitle: 'Based on routing 20',
          value: this.formatPercent(this.calculateProductionOtdPercent(productionDue.due_completed_today, productionDue.due_total)),
          valueSubtitle: `${this.formatInteger(productionDue.due_completed_today)} of ${this.formatInteger(productionDue.due_total)} work orders`,
        },
        {
          title: 'Ready to Ship, this period',
          value: this.formatCurrency(report.openBalanceCurrentMonth),
        },
        {
          title: 'Open Lines Current Week',
          value: this.formatInteger(report.openLinesForCurrentWeek),
        },
        {
          title: 'Open Lines Today',
          value: this.formatInteger(report.openLinesToday),
        },
        {
          title: 'Op 10 Completed Today',
          value: this.formatInteger(report.ops10RoutingCompleted),
        },
        {
          title: 'OP 20 due and overdue',
          value: this.formatInteger(this.toNumber(productionDue.total_overdue_orders) + this.toNumber(productionDue.due_open)),
        },
        {
          title: 'Future Open Revenue, Current Month',
          subtitle: `${String(futureRevenue.dateFrom || reportDate)} - ${String(futureRevenue.dateTo || reportDate)}`,
          value: this.formatCurrency(futureRevenue.value),
        },
        {
          title: 'Next 3 months',
          value: this.formatCurrency(report.getThreeMonthsRevenue?.value),
        },
        {
          title: 'Total Inventory $',
          subtitle: 'Total value in inventory',
          value: this.formatCurrency(report.inventory_value),
        },
        {
          title: 'FG Inventory $',
          value: this.formatCurrency(report.fgLV?.total),
        },
        {
          title: 'JIAXING Inventory $',
          value: this.formatCurrency(report.jx01?.total),
        },
        {
          title: 'TRANSIT Inventory $',
          value: this.formatCurrency(report.transit_total_ext_cost),
        },
        {
          title: 'Safety Stock $',
          value: this.formatCurrency(report.ss?.total),
        },
        {
          title: 'REJECT Inventory $',
          value: this.formatCurrency(report.reject_total_ext_cost),
        },
        {
          title: 'WIP $',
          value: this.formatCurrency(report.wip),
        },
      ],
      shippingDetailsTitle: `% Shipping OTD (${reportDate}) DETAILS`,
      shippingDetailsRows: (report.onTime || []).map((row) => {
        const totalLines = this.toNumber(row.total_lines_today ?? row.toal_lines_today ?? row.total_shipped_today);
        const shippedBefore = this.toNumber(row.shipped_before_or_on_due_date);

        return {
          customerName: `- ${String(row.so_cust || '').trim()}`,
          shippedBeforeOrOnPerformanceDate: shippedBefore,
          totalNumberOfLinesShippedToday: totalLines,
          otdPercent: this.formatPercent(totalLines > 0 ? (shippedBefore / totalLines) * 100 : 0),
        };
      }),
      inventoryRows: [],
      inventoryTurnsRows: [
        {
          label: 'RMLV',
          lessThanOne: this.formatCurrency(report.eye01?.lessthanone),
          greaterThanOrEqualToOne: this.formatCurrency(report.eye01?.greaterthanorequaltoone),
        },
        {
          label: 'FGLV',
          lessThanOne: this.formatCurrency(report.fgLV?.lessthanone),
          greaterThanOrEqualToOne: this.formatCurrency(report.fgLV?.greaterthanorequaltoone),
        },
        {
          label: 'All',
          lessThanOne: this.formatCurrency(report.all?.lessthanone),
          greaterThanOrEqualToOne: this.formatCurrency(report.all?.greaterthanorequaltoone),
        },
      ],
      lateReasonCodeRows: (report.lateReasonCodes || []).map((row) => ({
        lateReasonCode: `- ${String(row.lateReasonCode || '').trim()}`,
        value: this.toNumber(row.value),
      })),
    };
  }

  private formatCurrency(value: unknown): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber(value));
  }

  private formatPercent(value: unknown): string {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber(value))}%`;
  }

  private formatInteger(value: unknown): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(this.toNumber(value));
  }

  private calculateProductionOtdPercent(completed: unknown, total: unknown): number {
    const completedValue = this.toNumber(completed);
    const totalValue = this.toNumber(total);
    return totalValue > 0 ? (completedValue / totalValue) * 100 : 0;
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
