import type { ScheduledJobRunResultDto } from '../scheduled-jobs.service';

export type { ScheduledJobRunResultDto };

export interface ScheduledJobHandler {
  handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto>;
}
