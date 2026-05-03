import { Injectable, Logger } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class GraphicsDueTodayReportHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(GraphicsDueTodayReportHandler.name);

  constructor(private readonly mysqlService: MysqlService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Get graphics production due today
      const dueTodayRows = await this.mysqlService.query<Array<{ count: number }>>(`
        SELECT COUNT(*) as count
        FROM eyefidb.graphicsSchedule
        WHERE active = 1
        AND DATE(dueDate) = CURDATE()
        AND status != 'Completed'
      `);

      const totalOrders = dueTodayRows.length > 0 ? dueTodayRows[0].count : 0;

      const durationMs = Date.now() - startedAtMs;
      const message = `totalOrders=${totalOrders}`;
      this.logger.log(`[${trigger}] graphics-due-today-report -> ${message} in ${durationMs}ms`);

      return {
        id: 'graphics-due-today-report',
        name: 'Graphics Due Today Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Graphics production report: ${message}`,
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
      this.logger.error(`[${trigger}] graphics-due-today-report failed in ${durationMs}ms: ${message}`);

      return {
        id: 'graphics-due-today-report',
        name: 'Graphics Due Today Report',
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
