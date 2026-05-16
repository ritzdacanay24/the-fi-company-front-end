import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { SerialAvailabilityRepository } from '@/nest/modules/serial-availability/serial-availability.repository';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface StockPool {
  key: string;
  label: string;
  threshold: number;
  available: number;
}

const THRESHOLDS: Record<string, { label: string; threshold: number }> = {
  eyefi_available: { label: 'EyeFi Serials', threshold: 300 },
  ul_new_available: { label: 'UL Labels (New)', threshold: 150 },
  ul_used_available: { label: 'UL Labels (Used)', threshold: 100 },
  igt_available: { label: 'IGT Serials', threshold: 200 },
};

@Injectable()
export class SerialStockAlertHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(SerialStockAlertHandler.name);

  constructor(
    private readonly serialAvailabilityRepository: SerialAvailabilityRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const summary = await this.serialAvailabilityRepository.getAvailabilitySummary();

      const pools: StockPool[] = Object.entries(THRESHOLDS).map(([key, meta]) => ({
        key,
        label: meta.label,
        threshold: meta.threshold,
        available: Number((summary as RowDataPacket)[key] ?? 0),
      }));

      const atRisk = pools.filter((p) => p.available <= p.threshold);
      const critical = atRisk.filter((p) => p.available <= Math.floor(p.threshold * 0.3));
      const low = atRisk.filter((p) => p.available > Math.floor(p.threshold * 0.3));

      this.logger.log(
        `[${trigger}] serial-stock-alert -> ${critical.length} critical, ${low.length} low, ${pools.length - atRisk.length} healthy`,
      );

      if (atRisk.length === 0) {
        return {
          ok: true,
          statusCode: 200,
          durationMs: Date.now() - startedAtMs,
          message: 'All serial pools are healthy. No alert sent.',
          id: 'serial-stock-alert',
          name: 'Serial Stock Alert',
          trigger,
        };
      }

      const to = await this.scheduledJobRecipientsService.resolveSubscribedEmails(SCHEDULED_JOB_IDS.SERIAL_STOCK_ALERT);

      if (to.length === 0) {
        this.logger.warn('serial-stock-alert: no recipients configured for job serial-stock-alert — skipping email');
        return {
          ok: true,
          statusCode: 200,
          durationMs: Date.now() - startedAtMs,
          message: `${atRisk.length} pools at risk but no recipients configured for serial-stock-alert.`,
          id: 'serial-stock-alert',
          name: 'Serial Stock Alert',
          trigger,
        };
      }

      const subject =
        critical.length > 0
          ? `🚨 CRITICAL: Serial Stock Alert — ${critical.length} pool(s) critically low`
          : `⚠️ Serial Stock Alert — ${low.length} pool(s) below threshold`;

      const html = this.emailTemplateService.render('serial-stock-alert', this.buildTemplateContext(pools, critical, low));

      await this.emailService.sendMail({
        to,
        scheduledJobId: SCHEDULED_JOB_IDS.SERIAL_STOCK_ALERT,
        subject,
        html,
      });

      this.logger.log(`serial-stock-alert: email sent to ${to.join(', ')}`);

      return {
        ok: true,
        statusCode: 200,
        durationMs: Date.now() - startedAtMs,
        message: `Alert sent for ${atRisk.length} pool(s) (${critical.length} critical, ${low.length} low) to ${to.length} recipient(s).`,
        id: 'serial-stock-alert',
        name: 'Serial Stock Alert',
        trigger,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`serial-stock-alert failed: ${message}`, err instanceof Error ? err.stack : undefined);

      return {
        ok: false,
        statusCode: 500,
        durationMs: Date.now() - startedAtMs,
        message,
        id: 'serial-stock-alert',
        name: 'Serial Stock Alert',
        trigger,
      };
    }
  }

  private buildTemplateContext(
    pools: StockPool[],
    critical: StockPool[],
    low: StockPool[],
  ): Record<string, unknown> {
    const reportDate = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const enrichedPools = pools.map((p) => {
      const pct = p.threshold > 0 ? Math.min(100, Math.round((p.available / p.threshold) * 100)) : 100;
      const isCritical = p.available <= Math.floor(p.threshold * 0.3);
      const isLow = !isCritical && p.available <= p.threshold;
      const shortfall = Math.max(0, p.threshold - p.available);
      const buffer = Math.max(0, p.available - p.threshold);

      return {
        label: p.label,
        availableFormatted: p.available.toLocaleString(),
        thresholdFormatted: p.threshold.toLocaleString(),
        pct,
        statusLabel: isCritical ? 'CRITICAL' : isLow ? 'LOW' : 'Healthy',
        statusColor: isCritical ? '#dc3545' : isLow ? '#fd7e14' : '#198754',
        barColor: isCritical ? '#dc3545' : isLow ? '#fd7e14' : '#198754',
        shortfallDisplay: shortfall > 0 ? `-${shortfall.toLocaleString()}` : `✓ ${buffer.toLocaleString()} buffer`,
        shortfallColor: shortfall > 0 ? '#dc3545' : '#198754',
        shortfallFontWeight: shortfall > 0 ? '600' : 'normal',
      };
    });

    return {
      reportDate,
      pools: enrichedPools,
      hasCritical: critical.length > 0,
      criticalNames: critical.map((p) => p.label).join(', '),
      criticalVerb: critical.length === 1 ? 'is' : 'are',
      lowNames: low.map((p) => p.label).join(', '),
      lowVerb: low.length === 1 ? 'is' : 'are',
    };
  }
}
