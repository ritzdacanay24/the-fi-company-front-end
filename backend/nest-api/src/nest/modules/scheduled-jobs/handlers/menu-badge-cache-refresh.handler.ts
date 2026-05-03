import { Injectable, Logger } from '@nestjs/common';
import { MenuBadgeCacheRefreshService } from '@/nest/modules/menu-badge/menu-badge-cache-refresh.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class MenuBadgeCacheRefreshHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(MenuBadgeCacheRefreshHandler.name);

  constructor(private readonly menuBadgeCacheRefreshService: MenuBadgeCacheRefreshService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      await this.menuBadgeCacheRefreshService.refreshCachedBadgeCounts();

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] menu-badge-cache-refresh -> refreshed menu badge cache in ${durationMs}ms`);

      return {
        id: 'menu-badge-cache-refresh',
        name: 'Menu Badge Cache Refresh',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: 'Menu badge cache refreshed successfully.',
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
      this.logger.error(`[${trigger}] menu-badge-cache-refresh failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] menu-badge-cache-refresh ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'menu-badge-cache-refresh',
        name: 'Menu Badge Cache Refresh',
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
