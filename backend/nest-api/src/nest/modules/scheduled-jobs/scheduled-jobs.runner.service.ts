import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SCHEDULED_JOBS_TIMEZONE } from './scheduled-jobs.definitions';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Injectable()
export class ScheduledJobsRunnerService {
  constructor(private readonly scheduledJobsService: ScheduledJobsService) {}

  @Cron('0 */30 * * * 1-5', { name: 'scheduled-jobs.dropin-workorder-emails', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runDropInWorkOrderEmails(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('dropin-workorder-emails');
  }

  @Cron('0 */6 * * * *', { name: 'scheduled-jobs.clean-users', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runCleanUsers(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('clean-users');
  }

  @Cron('0 */20 * * * *', { name: 'scheduled-jobs.graphics-work-order', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runGraphicsWorkOrder(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('graphics-work-order');
  }

  @Cron('0 0 7 * * *', { name: 'scheduled-jobs.vehicle-expiration-email', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runVehicleExpirationEmail(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('vehicle-expiration-email');
  }

  @Cron('0 0 4 * * 1-5', { name: 'scheduled-jobs.early-morning-group', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runEarlyMorningGroup(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('overdue-orders');
    await this.scheduledJobsService.runJobIfEnabled('completed-production-orders');
    await this.scheduledJobsService.runJobIfEnabled('fs-job-report-morning');
    await this.scheduledJobsService.runJobIfEnabled('fs-job-notice');
  }

  @Cron('0 0 16 * * 1-5', { name: 'scheduled-jobs.daily-report-insert', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runDailyReportInsert(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('daily-report-insert');
  }

  @Cron('0 0 14 * * 1-5', { name: 'scheduled-jobs.inspection-email', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runInspectionEmail(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('inspection-email');
  }

  @Cron('0 0 17 * * 1-5', { name: 'scheduled-jobs.fs-job-report-evening', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runFsJobReportEvening(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('fs-job-report-evening');
  }

  @Cron('0 0 6 * * 1-5', { name: 'scheduled-jobs.past-due-field-service-requests', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runPastDueFieldServiceRequests(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('past-due-field-service-requests');
  }

  @Cron('0 0 7 * * *', { name: 'scheduled-jobs.serial-stock-alert', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runSerialStockAlert(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('serial-stock-alert');
  }

  @Cron('0 0 7 * * 1-5', { name: 'scheduled-jobs.lnw-delivery', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runLnwDelivery(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('lnw-delivery');
  }

  @Cron('0 0 9 * * 1-5', { name: 'scheduled-jobs.overdue-qir', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runOverdueQir(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('overdue-qir');
  }

  @Cron('0 0 9 * * 1-5', { name: 'scheduled-jobs.overdue-safety-incident', timeZone: SCHEDULED_JOBS_TIMEZONE })
  async runOverdueSafetyIncident(): Promise<void> {
    await this.scheduledJobsService.runJobIfEnabled('overdue-safety-incident');
  }
}
