import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface ShippingChange extends RowDataPacket {
  id: number;
  order_number: string;
  change_type: string;
  change_detail: string;
  changed_by: string;
  created_at: string;
}

@Injectable()
export class ShippingChangesHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(ShippingChangesHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();
    // NOTE: The PHP equivalent (shippingChanges.php) had its sendEmail() method entirely
    // commented out. This job has no active logic to migrate. It is a no-op stub until
    // the feature is intentionally designed and implemented.
    this.logger.warn(`[${trigger}] shipping-changes -> handler is a stub (PHP feature was disabled)`);
    const durationMs = Date.now() - startedAtMs;
    return {
      id: 'shipping-changes',
      name: 'Shipping Changes Report',
      trigger,
      ok: true,
      statusCode: 200,
      durationMs,
      message: 'Handler is a stub — PHP source had this feature disabled. No action taken.',
      lastRun: {
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        status: 'success',
        triggerType: trigger,
        errorMessage: null,
      },
    };
  }
}
