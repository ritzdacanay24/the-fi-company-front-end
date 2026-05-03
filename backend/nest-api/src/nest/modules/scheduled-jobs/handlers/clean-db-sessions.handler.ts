import { Injectable, Logger } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class CleanDbSessionsHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(CleanDbSessionsHandler.name);

  constructor(private readonly mysqlService: MysqlService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Default session timeout: 30 days
      const sessionTimeoutDays = Number(process.env.DB_SESSION_TIMEOUT ?? 30);

      // Delete expired sessions
      const result = await this.mysqlService.query(`
        DELETE FROM db.session 
        WHERE TIMESTAMPDIFF(DAY, createdDate, NOW()) > ?
      `, [sessionTimeoutDays]);

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] clean-db-sessions -> expired sessions cleaned in ${durationMs}ms`);

      return {
        id: 'clean-db-sessions',
        name: 'Clean Database Sessions',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Database sessions older than ${sessionTimeoutDays} days cleaned.`,
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
      this.logger.error(`[${trigger}] clean-db-sessions failed in ${durationMs}ms: ${message}`);

      return {
        id: 'clean-db-sessions',
        name: 'Clean Database Sessions',
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
