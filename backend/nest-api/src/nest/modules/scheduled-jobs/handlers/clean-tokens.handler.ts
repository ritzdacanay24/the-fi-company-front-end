import { Injectable, Logger } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { ScheduledJobHandler } from './scheduled-job.handler';
import { ScheduledJobRunResultDto } from '../scheduled-jobs.service';

@Injectable()
export class CleanTokensHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(CleanTokensHandler.name);

  constructor(private readonly mysqlService: MysqlService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();
    const tokenExpirationMinutes = Number(process.env.DB_TOKEN_EXPIRATION ?? 1440);

    try {
      await this.mysqlService.query(`DELETE FROM db.token WHERE TIMESTAMPDIFF(MINUTE, createdDate, NOW()) > ?`, [
        tokenExpirationMinutes,
      ]);

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] clean-tokens -> deleted expired tokens in ${durationMs}ms`);

      return {
        id: 'clean-tokens',
        name: 'Clean Tokens',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Expired tokens deleted.`,
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
      this.logger.error(`[${trigger}] clean-tokens failed in ${durationMs}ms: ${message}`);

      return {
        id: 'clean-tokens',
        name: 'Clean Tokens',
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
