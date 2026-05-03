import { Injectable, Logger } from '@nestjs/common';
import { DailyReportService } from '@/nest/modules/reports/daily-report.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class DailyReportInsertHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(DailyReportInsertHandler.name);

  constructor(private readonly dailyReportService: DailyReportService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const report = await this.dailyReportService.getDailyReport();
      const durationMs = Date.now() - startedAtMs;

      this.logger.log(`[${trigger}] daily-report-insert -> daily report refreshed in ${durationMs}ms`);

      return {
        id: 'daily-report-insert',
        name: 'Daily Report Insert',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Daily report refreshed successfully (${Object.keys(report as Record<string, unknown>).length} keys).`,
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
        id: 'daily-report-insert',
        name: 'Daily Report Insert',
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
}
