export { ScheduledJobRunResultDto } from '../scheduled-jobs.service';

export interface ScheduledJobHandler {
  handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto>;
}
