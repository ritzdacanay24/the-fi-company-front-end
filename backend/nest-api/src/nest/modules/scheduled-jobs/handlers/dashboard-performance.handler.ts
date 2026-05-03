import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import { MysqlService } from '@/shared/database/mysql.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class DashboardPerformanceHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(DashboardPerformanceHandler.name);

  constructor(private readonly mysqlService: MysqlService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Store performance snapshot in db.dashPerformance (mirrors dashPerformance.php)
      const memoryAllocated = process.memoryUsage().heapTotal;
      const memoryUse = process.memoryUsage().heapUsed;
      const memoryUsage = (memoryUse / memoryAllocated) * 100;
      const memoryUsageConvert = this.formatBytes(memoryUse);
      const cpuUsage = os.loadavg()[0];
      const dateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await this.mysqlService.query(
        `INSERT INTO db.dashPerformance(memoryUsage, memoryUsageConvert, processes, dateTime, cpuUsage)
         VALUES (?, ?, ?, ?, ?)`,
        [memoryUsage, memoryUsageConvert, 0, dateTime, cpuUsage],
      );

      const durationMs = Date.now() - startedAtMs;
      const summary = `CPU: ${cpuUsage.toFixed(2)}, Memory: ${memoryUsage.toFixed(1)}% (${memoryUsageConvert})`;
      this.logger.log(`[${trigger}] dashboard-performance -> ${summary} in ${durationMs}ms`);

      return {
        id: 'dashboard-performance',
        name: 'Dashboard Performance Collection',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Performance metrics collected: ${summary}`,
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
      this.logger.error(`[${trigger}] dashboard-performance failed in ${durationMs}ms: ${message}`);

      return {
        id: 'dashboard-performance',
        name: 'Dashboard Performance Collection',
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

  private formatBytes(bytes: number): string {
    const units = ['b', 'kb', 'mb', 'gb'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i] ?? 'b'}`;
  }
}
