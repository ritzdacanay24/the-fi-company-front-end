import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { SCHEDULED_JOB_DEFINITIONS } from './scheduled-jobs.definitions';
import { ScheduledJobsConfigRepository } from './scheduled-jobs-config.repository';
import { ScheduledJobHandler } from './handlers/scheduled-job.handler';
import {
  CleanUsersHandler,
  FieldServiceOldWorkOrdersHandler,
  PastDueFieldServiceRequestsHandler,
  DropInWorkOrderEmailsHandler,
  VehicleExpirationEmailHandler,
  LnwDeliveryHandler,
  InspectionEmailHandler,
  CompletedProductionOrdersHandler,
  OverdueOrdersHandler,
  GraphicsWorkOrderHandler,
  MenuBadgeCacheRefreshHandler,
  DashboardPerformanceHandler,
  TotalShippedOrdersHandler,
  DailyReportInsertHandler,
  OpenShippingRequestsHandler,
  GraphicsDueTodayReportHandler,
  FsJobReportMorningHandler,
  FsJobNoticeHandler,
  SerialStockAlertHandler,
  OverdueQirHandler,
  OverdueSafetyIncidentHandler,
  InspectionChecklistReportGeneratorHandler,
  OpenChecklistInstancesLast3DaysHandler,
} from './handlers';

export type ScheduledJobRunStatus = 'success' | 'failure';

export interface ScheduledJobLastRun {
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  status: ScheduledJobRunStatus;
  triggerType: 'manual' | 'cron';
  errorMessage: string | null;
}

export interface ScheduledJobDto {
  id: string;
  name: string;
  cron: string;
  url: string;
  active: boolean;
  supportsRecipients?: boolean;
  note?: string;
  environmentBlocked?: boolean;
  environmentBlockMessage?: string;
  lastRun?: ScheduledJobLastRun;
  command: string;
  source: 'nest-cron';
  runnerEnabled: boolean;
}

export interface ScheduledJobRunResultDto {
  id: string;
  name: string;
  trigger: 'manual' | 'cron';
  ok: boolean;
  statusCode: number;
  durationMs: number;
  message: string;
  lastRun?: ScheduledJobLastRun;
  url?: string;
  responseSnippet?: string;
}

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);
  private readonly handlerMap: Map<string, ScheduledJobHandler>;
  private readonly isDevelopment: boolean;
  private readonly inspectionChecklistReportGeneratorEnabledInDevelopment: boolean;

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly scheduledJobsConfigRepository: ScheduledJobsConfigRepository,
    private readonly cleanUsersHandler: CleanUsersHandler,
    private readonly fieldServiceOldWorkOrdersHandler: FieldServiceOldWorkOrdersHandler,
    private readonly pastDueFieldServiceRequestsHandler: PastDueFieldServiceRequestsHandler,
    private readonly dropInWorkOrderEmailsHandler: DropInWorkOrderEmailsHandler,
    private readonly vehicleExpirationEmailHandler: VehicleExpirationEmailHandler,
    private readonly lnwDeliveryHandler: LnwDeliveryHandler,
    private readonly inspectionEmailHandler: InspectionEmailHandler,
    private readonly completedProductionOrdersHandler: CompletedProductionOrdersHandler,
    private readonly overdueOrdersHandler: OverdueOrdersHandler,
    private readonly graphicsWorkOrderHandler: GraphicsWorkOrderHandler,
    private readonly menuBadgeCacheRefreshHandler: MenuBadgeCacheRefreshHandler,
    private readonly dashboardPerformanceHandler: DashboardPerformanceHandler,
    private readonly totalShippedOrdersHandler: TotalShippedOrdersHandler,
    private readonly dailyReportInsertHandler: DailyReportInsertHandler,
    private readonly openShippingRequestsHandler: OpenShippingRequestsHandler,
    private readonly graphicsDueTodayReportHandler: GraphicsDueTodayReportHandler,
    private readonly fsJobReportMorningHandler: FsJobReportMorningHandler,
    private readonly fsJobNoticeHandler: FsJobNoticeHandler,
    private readonly serialStockAlertHandler: SerialStockAlertHandler,
    private readonly overdueQirHandler: OverdueQirHandler,
    private readonly overdueSafetyIncidentHandler: OverdueSafetyIncidentHandler,
    private readonly inspectionChecklistReportGeneratorHandler: InspectionChecklistReportGeneratorHandler,
    private readonly openChecklistInstancesLast3DaysHandler: OpenChecklistInstancesLast3DaysHandler,
  ) {
    this.handlerMap = new Map();
    this.isDevelopment = String(process.env.NODE_ENV ?? '').toLowerCase() === 'development';
    this.inspectionChecklistReportGeneratorEnabledInDevelopment =
      String(process.env.INSPECTION_CHECKLIST_REPORT_GENERATOR_ENABLED ?? 'false').toLowerCase().trim() === 'true';
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlerMap.set('clean-users', this.cleanUsersHandler);
    this.handlerMap.set('field-service-old-workorders', this.fieldServiceOldWorkOrdersHandler);
    this.handlerMap.set('past-due-field-service-requests', this.pastDueFieldServiceRequestsHandler);
    this.handlerMap.set('dropin-workorder-emails', this.dropInWorkOrderEmailsHandler);
    this.handlerMap.set('vehicle-expiration-email', this.vehicleExpirationEmailHandler);
    this.handlerMap.set('lnw-delivery', this.lnwDeliveryHandler);
    this.handlerMap.set('inspection-email', this.inspectionEmailHandler);
    this.handlerMap.set('completed-production-orders', this.completedProductionOrdersHandler);
    this.handlerMap.set('overdue-orders', this.overdueOrdersHandler);
    this.handlerMap.set('graphics-work-order', this.graphicsWorkOrderHandler);
    this.handlerMap.set('menu-badge-cache-refresh', this.menuBadgeCacheRefreshHandler);
    this.handlerMap.set('dashboard-performance', this.dashboardPerformanceHandler);
    this.handlerMap.set('total-shipped-orders', this.totalShippedOrdersHandler);
    this.handlerMap.set('daily-report-insert', this.dailyReportInsertHandler);
    this.handlerMap.set('open-shipping-requests', this.openShippingRequestsHandler);
    this.handlerMap.set('graphics-due-today-report', this.graphicsDueTodayReportHandler);
    this.handlerMap.set('fs-job-report', this.fsJobReportMorningHandler);
    this.handlerMap.set('fs-job-notice', this.fsJobNoticeHandler);
    this.handlerMap.set('serial-stock-alert', this.serialStockAlertHandler);
    this.handlerMap.set('overdue-qir', this.overdueQirHandler);
    this.handlerMap.set('overdue-safety-incident', this.overdueSafetyIncidentHandler);
    this.handlerMap.set('inspection-checklist-report-generator', this.inspectionChecklistReportGeneratorHandler);
    this.handlerMap.set('open-checklist-instances-last-3-days', this.openChecklistInstancesLast3DaysHandler);
  }

  isRunnerEnabled(): boolean {
    const raw = String(process.env.NEST_SCHEDULED_JOBS_ENABLED ?? 'false').toLowerCase().trim();
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  }

  async runJobIfEnabled(id: string): Promise<void> {
    if (!this.isRunnerEnabled()) {
      return;
    }

    if (!this.isJobEnabledForCurrentEnvironment(id)) {
      return;
    }

    const job = SCHEDULED_JOB_DEFINITIONS.find((row) => row.id === id);
    if (!job) {
      return;
    }

    // Check database config first, fall back to definition
    const config = await this.scheduledJobsConfigRepository.findById(id);
    const isActive = config ? config.active : job.active;

    if (!isActive) {
      return;
    }

    await this.runJobById(id, 'cron');
  }

  async listJobs(): Promise<ScheduledJobDto[]> {
    const runnerEnabled = this.isRunnerEnabled();

    // Load persisted configs from database
    const persistedConfigs = await this.scheduledJobsConfigRepository.findAll();
    const configMap = new Map(persistedConfigs.map(c => [c.id, c]));

    // Fetch last run info
    const rows = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT
        r.job_name,
        r.trigger_type,
        r.status,
        r.started_at,
        r.finished_at,
        r.duration_ms,
        r.error_message
      FROM scheduled_job_run r
      INNER JOIN (
        SELECT job_name, MAX(id) AS max_id
        FROM scheduled_job_run
        GROUP BY job_name
      ) latest ON r.job_name = latest.job_name AND r.id = latest.max_id
    `);

    const lastRunByJobId = new Map<string, ScheduledJobLastRun>();
    for (const row of rows) {
      const startedAt = this.normalizeDbDateToIso(row['started_at']);
      if (!startedAt) {
        continue;
      }

      lastRunByJobId.set(row['job_name'] as string, {
        startedAt,
        finishedAt: this.normalizeDbDateToIso(row['finished_at']),
        durationMs: row['duration_ms'] as number | null,
        status: row['status'] as ScheduledJobRunStatus,
        triggerType: row['trigger_type'] as 'manual' | 'cron',
        errorMessage: row['error_message'] as string | null,
      });
    }

    // Merge database configs with definitions
    return SCHEDULED_JOB_DEFINITIONS.map((job) => {
      const config = configMap.get(job.id);
      const mergedJob = config
        ? {
            ...job,
            cron: config.cron,
            active: config.active,
            note: this.getEffectiveNote(config.note, job.note),
          }
        : job;
      return this.toScheduledJobDto(mergedJob, runnerEnabled, lastRunByJobId.get(job.id));
    });
  }

  async updateJob(
    id: string,
    data: { cron: string; active: boolean; note?: string },
  ): Promise<ScheduledJobDto | null> {
    const jobIndex = SCHEDULED_JOB_DEFINITIONS.findIndex((row) => row.id === id);
    if (jobIndex === -1) {
      return null;
    }

    // Persist to database
    const config = await this.scheduledJobsConfigRepository.upsert({
      id,
      cron: data.cron,
      active: data.active,
      note: data.note,
    });

    if (!config) {
      this.logger.error(`Failed to persist job config for ${id}`);
      return null;
    }

    // Return merged job definition with database values
    const job = SCHEDULED_JOB_DEFINITIONS[jobIndex];
    const mergedJob = {
      ...job,
      cron: config.cron,
      active: config.active,
      note: this.getEffectiveNote(config.note, job.note),
    };

    const runnerEnabled = this.isRunnerEnabled();
    return this.toScheduledJobDto(mergedJob, runnerEnabled, undefined);
  }

  async runJobById(id: string, trigger: 'manual' | 'cron', skipDevNotification: boolean = false): Promise<ScheduledJobRunResultDto> {
    const job = SCHEDULED_JOB_DEFINITIONS.find((row) => row.id === id);
    if (!job) {
      return {
        id,
        name: 'Unknown Job',
        trigger,
        ok: false,
        statusCode: 404,
        durationMs: 0,
        message: `Scheduled job not found: ${id}`,
      };
    }

    if (!this.isJobEnabledForCurrentEnvironment(id)) {
      return {
        id: job.id,
        name: job.name,
        trigger,
        ok: false,
        statusCode: 403,
        durationMs: 0,
        message: this.getJobEnvironmentBlockMessage(id),
        url: job.url,
      };
    }

    const startedAtMs = Date.now();
    const startedAtIso = new Date(startedAtMs).toISOString();
    let runId: number | null = null;

    try {
      const insertResult = await this.mysqlService.execute(
        `INSERT INTO scheduled_job_run (job_name, trigger_type, status, started_at) VALUES (?, ?, 'success', NOW())`,
        [job.id, trigger],
      );
      runId = (insertResult as any)?.insertId ?? null;
    } catch (dbErr) {
      this.logger.warn(`[${trigger}] ${job.id} - could not insert run record: ${dbErr}`);
    }

    const finishRun = async (
      status: ScheduledJobRunStatus,
      durationMs: number,
      errorMessage?: string,
    ): Promise<ScheduledJobLastRun> => {
      const finishedAtIso = new Date().toISOString();
      if (runId !== null) {
        try {
          await this.mysqlService.query(
            `UPDATE scheduled_job_run SET status = ?, finished_at = NOW(), duration_ms = ?, error_message = ? WHERE id = ?`,
            [status, durationMs, errorMessage ?? null, runId],
          );
        } catch (dbErr) {
          this.logger.warn(`[${trigger}] ${job.id} - could not update run record: ${dbErr}`);
        }
      }
      return {
        startedAt: startedAtIso,
        finishedAt: finishedAtIso,
        durationMs,
        status,
        triggerType: trigger,
        errorMessage: errorMessage ?? null,
      };
    };

    try {
      // Dispatch to handler
      const handler = this.handlerMap.get(job.id);
      if (!handler) {
        const durationMs = Date.now() - startedAtMs;
        const lastRun = await finishRun('failure', durationMs, `No handler registered for ${job.id}.`);
        return {
          id: job.id,
          name: job.name,
          trigger,
          ok: false,
          statusCode: 501,
          durationMs,
          message: `No handler registered for ${job.id}.`,
          lastRun,
          url: job.url,
        };
      }

      const result = await handler.handle(trigger);
      const durationMs = Date.now() - startedAtMs;
      const lastRun = await finishRun(result.ok ? 'success' : 'failure', durationMs, result.ok ? undefined : result.message);

      return {
        ...result,
        lastRun,
        url: job.url,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startedAtMs;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${trigger}] ${job.id} failed in ${durationMs}ms: ${message}`);
      const lastRun = await finishRun('failure', durationMs, message);

      return {
        id: job.id,
        name: job.name,
        trigger,
        ok: false,
        statusCode: 500,
        durationMs,
        message,
        lastRun,
        url: job.url,
      };
    }
  }

  async testRunJobById(id: string): Promise<ScheduledJobRunResultDto> {
    const testTo = this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO');

    // Enable test mode: all emails from job go to Ritz only
    this.emailService.setTestMode(testTo);

    try {
      // Run the job normally, but with all emails redirected to Ritz
      const result = await this.runJobById(id, 'manual', true);

      // Send one confirmation email that job ran
      try {
        await this.emailService.sendMailDirect({
          to: testTo,
          subject: `[TEST BUTTON] Job Test Completed: ${result.name}`,
          html: `<p style="font-family:monospace">
            <strong>SCHEDULED JOB TEST RESULT</strong><br><br>
            <strong>Job:</strong> ${result.name} (<code>${id}</code>)<br>
            <strong>Status:</strong> ${result.ok ? 'OK' : 'FAILED'}<br>
            <strong>Duration:</strong> ${result.durationMs}ms<br>
            <strong>Message:</strong> ${result.message}<br>
            <strong>Time:</strong> ${new Date().toISOString()}<br>
          </p>
          <hr><small>Job was executed and all output was sent to this email.</small>`,
        });
      } catch (err) {
        this.logger.warn(`Could not send test confirmation email for job ${id}: ${err}`);
      }

      return result;
    } finally {
      // Always clear test mode
      this.emailService.clearTestMode();
    }
  }

  private async sendDevRunNotification(
    id: string,
    name: string,
    trigger: 'manual' | 'cron',
    ok: boolean,
    durationMs: number,
    message: string,
  ): Promise<void> {
    const status = ok ? '[OK]' : '[FAILED]';
    const color = ok ? '#2d7a2d' : '#a00';
    const devTo = String(process.env.DEV_EMAIL_REROUTE_TO ?? '');
    if (!devTo) return;

    await this.emailService.sendMail({
      to: devTo,
      subject: `[DEV] Scheduled Job: ${name} - ${ok ? 'OK' : 'FAILED'} (${trigger})`,
      html: `<p style="font-family:monospace">
        <strong style="color:${color}">${status}</strong><br><br>
        <strong>Job:</strong> ${name} (<code>${id}</code>)<br>
        <strong>Trigger:</strong> ${trigger}<br>
        <strong>Duration:</strong> ${durationMs}ms<br>
        <strong>Message:</strong> ${message}<br>
        <strong>Time:</strong> ${new Date().toISOString()}
      </p>
      <hr><small>This email is only sent in NODE_ENV=development</small>`,
    });
  }

  private toScheduledJobDto(
    job: (typeof SCHEDULED_JOB_DEFINITIONS)[number],
    runnerEnabled: boolean,
    lastRun?: ScheduledJobLastRun,
  ): ScheduledJobDto {
    const environmentBlocked = !this.isJobEnabledForCurrentEnvironment(job.id);
    const environmentBlockMessage = environmentBlocked ? this.getJobEnvironmentBlockMessage(job.id) : undefined;

    return {
      ...job,
      environmentBlocked,
      environmentBlockMessage,
      lastRun,
      command: 'NEST_HANDLER_DISPATCH scheduledJobsService.runJobById(jobId)',
      source: 'nest-cron' as const,
      runnerEnabled,
    };
  }

  private normalizeDbDateToIso(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const text = String(value);
    try {
      return new Date(text).toISOString();
    } catch {
      return null;
    }
  }

  private isJobEnabledForCurrentEnvironment(id: string): boolean {
    if (id !== 'inspection-checklist-report-generator') {
      return true;
    }

    if (!this.isDevelopment) {
      return true;
    }

    if (this.inspectionChecklistReportGeneratorEnabledInDevelopment) {
      return true;
    }

    return false;
  }

  private getJobEnvironmentBlockMessage(id: string): string {
    if (id === 'inspection-checklist-report-generator') {
      return 'Inspection checklist report generation is blocked in development unless INSPECTION_CHECKLIST_REPORT_GENERATOR_ENABLED=true.';
    }

    return `Scheduled job ${id} is blocked in the current environment.`;
  }

  private getEffectiveNote(configNote: string | null | undefined, definitionNote: string | undefined): string | undefined {
    const normalized = String(configNote ?? '').trim();
    if (!normalized) {
      return definitionNote;
    }

    const lower = normalized.toLowerCase();
    if (lower === 'disabled' || lower === 'disabled - enable from ux') {
      return definitionNote;
    }

    return normalized;
  }

}
