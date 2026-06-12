import { Injectable, Logger } from '@nestjs/common';
import { EquipmentPrintersAlertsRunnerService } from '@/nest/modules/equipment-printers/equipment-printers.alerts.runner.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class EquipmentPrintersAlertMonitorHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(EquipmentPrintersAlertMonitorHandler.name);

  constructor(
    private readonly equipmentPrintersAlertsRunnerService: EquipmentPrintersAlertsRunnerService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const recipients = await this.scheduledJobRecipientsService.resolveSubscribedEmails(
        SCHEDULED_JOB_IDS.EQUIPMENT_PRINTERS_ALERT_MONITOR,
      );

      await this.equipmentPrintersAlertsRunnerService.runPrinterAlertMonitor(recipients);

      return {
        ok: true,
        statusCode: 200,
        durationMs: Date.now() - startedAtMs,
        message: 'Printer alert monitor executed successfully.',
        id: 'equipment-printers-alert-monitor',
        name: 'Equipment Printers Alert Monitor',
        trigger,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`equipment-printers-alert-monitor failed: ${message}`);

      return {
        ok: false,
        statusCode: 500,
        durationMs: Date.now() - startedAtMs,
        message,
        id: 'equipment-printers-alert-monitor',
        name: 'Equipment Printers Alert Monitor',
        trigger,
      };
    }
  }
}
