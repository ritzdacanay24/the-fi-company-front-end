import { Injectable, Logger } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { ScheduledJobHandler } from './scheduled-job.handler';
import { ScheduledJobRunResultDto } from '../scheduled-jobs.service';

@Injectable()
export class CleanUsersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(CleanUsersHandler.name);

  constructor(private readonly mysqlService: MysqlService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();
    const inactivityDays = Number(process.env.DB_INACTIVITY ?? 90);

    try {
      await this.mysqlService.query(
        `UPDATE db.users SET access = 0 WHERE access != 0 AND id NOT IN (473, 474) AND DATEDIFF(CURDATE(), DATE(lastLoggedIn)) >= ?`,
        [inactivityDays],
      );

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] clean-users -> disabled inactive users in ${durationMs}ms`);

      return {
        id: 'clean-users',
        name: 'Clean Users',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Inactive users disabled.`,
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
      this.logger.error(`[${trigger}] clean-users failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] clean-users ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'clean-users',
        name: 'Clean Users',
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
