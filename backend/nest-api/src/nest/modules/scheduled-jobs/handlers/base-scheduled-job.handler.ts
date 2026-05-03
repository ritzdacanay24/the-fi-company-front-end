import { ScheduledJobRunResultDto } from '../scheduled-jobs.service';

export abstract class BaseScheduledJobHandler {
  protected buildResult(
    jobId: string,
    jobName: string,
    trigger: 'manual' | 'cron',
    ok: boolean,
    statusCode: number,
    durationMs: number,
    message: string,
  ): ScheduledJobRunResultDto {
    const startedAtMs = Date.now() - durationMs;
    return {
      id: jobId,
      name: jobName,
      trigger,
      ok,
      statusCode,
      durationMs,
      message,
      lastRun: {
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        status: ok ? 'success' : 'failure',
        triggerType: trigger,
        errorMessage: ok ? null : message,
      },
    };
  }
}
