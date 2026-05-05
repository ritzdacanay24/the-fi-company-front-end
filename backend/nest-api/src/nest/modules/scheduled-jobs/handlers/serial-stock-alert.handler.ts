import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { SerialAvailabilityRepository } from '@/nest/modules/serial-availability/serial-availability.repository';
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
    private readonly emailNotificationService: EmailNotificationService,
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

      const recipientRows = await this.emailNotificationService.find({ location: 'serial_stock_alert' });
      const to = (recipientRows as Array<{ email?: string }>)
        .map((r) => r.email)
        .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

      if (to.length === 0) {
        this.logger.warn('serial-stock-alert: no recipients configured at location=serial_stock_alert — skipping email');
        return {
          ok: true,
          statusCode: 200,
          durationMs: Date.now() - startedAtMs,
          message: `${atRisk.length} pools at risk but no recipients configured (location=serial_stock_alert).`,
          id: 'serial-stock-alert',
          name: 'Serial Stock Alert',
          trigger,
        };
      }

      const subject =
        critical.length > 0
          ? `🚨 CRITICAL: Serial Stock Alert — ${critical.length} pool(s) critically low`
          : `⚠️ Serial Stock Alert — ${low.length} pool(s) below threshold`;

      const html = this.buildEmailHtml(pools, critical, low);

      await this.emailService.sendMail({ to, subject, html });

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

  private buildEmailHtml(
    pools: StockPool[],
    critical: StockPool[],
    low: StockPool[],
  ): string {
    const now = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const rowHtml = pools
      .map((p) => {
        const pct = p.threshold > 0 ? Math.min(100, Math.round((p.available / p.threshold) * 100)) : 100;
        const isCritical = p.available <= Math.floor(p.threshold * 0.3);
        const isLow = !isCritical && p.available <= p.threshold;
        const statusColor = isCritical ? '#dc3545' : isLow ? '#fd7e14' : '#198754';
        const statusLabel = isCritical ? 'CRITICAL' : isLow ? 'LOW' : 'Healthy';
        const barColor = isCritical ? '#dc3545' : isLow ? '#fd7e14' : '#198754';
        const shortfall = Math.max(0, p.threshold - p.available);

        return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;">${p.label}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;font-weight:600;">${p.available.toLocaleString()}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;">${p.threshold.toLocaleString()}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;color:${shortfall > 0 ? '#dc3545' : '#198754'};font-weight:${shortfall > 0 ? '600' : 'normal'};">
              ${shortfall > 0 ? '-' + shortfall.toLocaleString() : '✓ ' + (p.available - p.threshold).toLocaleString() + ' buffer'}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;">
              <div style="background:#e9ecef;border-radius:4px;height:8px;width:100%;min-width:80px;">
                <div style="background:${barColor};height:8px;border-radius:4px;width:${pct}%;"></div>
              </div>
              <small style="color:#6c757d;">${pct}%</small>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;">
              <span style="background:${statusColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${statusLabel}</span>
            </td>
          </tr>`;
      })
      .join('');

    const banner =
      critical.length > 0
        ? `<div style="background:#dc3545;color:#fff;padding:16px 24px;border-radius:8px;margin-bottom:20px;">
            <strong>🚨 CRITICAL ALERT:</strong> ${critical.map((p) => p.label).join(', ')} ${critical.length === 1 ? 'is' : 'are'} critically low (below 30% of threshold). Immediate action required.
           </div>`
        : `<div style="background:#fd7e14;color:#fff;padding:16px 24px;border-radius:8px;margin-bottom:20px;">
            <strong>⚠️ STOCK ALERT:</strong> ${low.map((p) => p.label).join(', ')} ${low.length === 1 ? 'is' : 'are'} below the minimum threshold.
           </div>`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#212529;max-width:720px;margin:0 auto;padding:24px;">
  <div style="border-bottom:3px solid #0d6efd;padding-bottom:16px;margin-bottom:24px;">
    <h2 style="margin:0;color:#0d6efd;">Serial Stock Report</h2>
    <p style="margin:4px 0 0;color:#6c757d;font-size:14px;">${now} (Pacific Time)</p>
  </div>

  ${banner}

  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#f8f9fa;">
        <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #dee2e6;">Pool</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #dee2e6;">Available</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #dee2e6;">Threshold</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #dee2e6;">Shortfall / Buffer</th>
        <th style="padding:10px 12px;border-bottom:2px solid #dee2e6;">Coverage</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #dee2e6;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowHtml}
    </tbody>
  </table>

  <p style="margin-top:24px;font-size:13px;color:#6c757d;">
    This report is sent daily at 7:00 AM PT when one or more serial pools are at or below their threshold.
    To manage serial pools, visit the <strong>Serial Management Dashboard</strong> in the EyeFi portal.
  </p>
</body>
</html>`;
  }
}
