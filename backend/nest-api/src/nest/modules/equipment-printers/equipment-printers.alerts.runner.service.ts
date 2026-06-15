import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { EquipmentPrintersRepository, EquipmentPrinterAlertState } from './equipment-printers.repository';
import { EquipmentPrintersService, PrinterData } from './equipment-printers.service';

type AlertSeverity = 'warning' | 'critical';

interface PrinterAlertIssue {
  printerId: number;
  ipAddress: string;
  model: string;
  location?: string;
  alertKey: string;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  lastValue?: string;
}

@Injectable()
export class EquipmentPrintersAlertsRunnerService {
  private readonly logger = new Logger(EquipmentPrintersAlertsRunnerService.name);

  constructor(
    private readonly equipmentPrintersService: EquipmentPrintersService,
    private readonly equipmentPrintersRepository: EquipmentPrintersRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async runPrinterAlertMonitor(recipients: string[] = []): Promise<void> {
    try {
      const printers = await this.equipmentPrintersService.getAllPrintersStatus();
      const activeStates = await this.equipmentPrintersRepository.getActiveAlertStates();
      const stateByCompositeKey = new Map<string, EquipmentPrinterAlertState>();

      activeStates.forEach((state) => {
        stateByCompositeKey.set(this.toCompositeKey(state.printer_id, state.alert_key), state);
      });

      const settings = await this.equipmentPrintersRepository.getAlertSettings();
      const warningThreshold = settings
        ? Number(settings.warning_threshold_percent)
        : this.getNumberConfig('PRINTER_WARNING_THRESHOLD_PERCENT', 25);
      const criticalThreshold = settings
        ? Number(settings.critical_threshold_percent)
        : this.getNumberConfig('PRINTER_CRITICAL_THRESHOLD_PERCENT', 10);
      const cooldownMinutes = settings
        ? Number(settings.cooldown_minutes)
        : this.getNumberConfig('PRINTER_ALERT_COOLDOWN_MINUTES', 120);

      if (settings && !Boolean(settings.is_enabled)) {
        this.logger.debug('Printer alert monitor is disabled by DB settings.');
        return;
      }

      const currentKeys = new Set<string>();
      const issuesToNotify: PrinterAlertIssue[] = [];

      for (const printer of printers) {
        const issues = this.buildPrinterIssues(printer, warningThreshold, criticalThreshold);

        for (const issue of issues) {
          const compositeKey = this.toCompositeKey(issue.printerId, issue.alertKey);
          currentKeys.add(compositeKey);

          const existingState = stateByCompositeKey.get(compositeKey);
          const shouldNotify = this.shouldNotify(existingState, issue.severity, cooldownMinutes);

          if (shouldNotify) {
            issuesToNotify.push(issue);
          }

          await this.equipmentPrintersRepository.upsertAlertState({
            printerId: issue.printerId,
            alertKey: issue.alertKey,
            alertType: issue.alertType,
            severity: issue.severity,
            message: issue.message,
            lastValue: issue.lastValue,
            notifiedNow: shouldNotify,
          });
        }
      }

      for (const state of activeStates) {
        const key = this.toCompositeKey(state.printer_id, state.alert_key);
        if (!currentKeys.has(key)) {
          await this.equipmentPrintersRepository.deactivateAlertStateById(state.id);
        }
      }

      if (issuesToNotify.length > 0) {
        await this.sendAlertEmail(issuesToNotify, recipients);
      }
    } catch (error) {
      this.logger.error('Equipment printer alert monitor failed', error as Error);
    }
  }

  private buildPrinterIssues(
    printer: PrinterData,
    warningThreshold: number,
    criticalThreshold: number,
  ): PrinterAlertIssue[] {
    const issues: PrinterAlertIssue[] = [];

    if (printer.status !== 'online') {
      issues.push({
        printerId: printer.printerId,
        ipAddress: printer.ipAddress,
        model: printer.model,
        location: printer.location,
        alertKey: 'printer:offline',
        alertType: 'offline',
        severity: 'critical',
        message: `Printer is offline (${printer.error || 'unreachable'})`,
        lastValue: printer.error || 'offline',
      });

      return issues;
    }

    for (const consumable of printer.consumables || []) {
      const levelPer = consumable.levelPer;
      const state = (consumable.levelState || '').toLowerCase();
      const isCriticalState = ['empty', 'full', 'lifeend'].includes(state);
      const isWarningState = ['nearempty', 'nearlifeend'].includes(state);

      let severity: AlertSeverity | null = null;
      if (isCriticalState || (levelPer !== undefined && levelPer <= criticalThreshold)) {
        severity = 'critical';
      } else if (isWarningState || (levelPer !== undefined && levelPer <= warningThreshold)) {
        severity = 'warning';
      }

      if (severity) {
        issues.push({
          printerId: printer.printerId,
          ipAddress: printer.ipAddress,
          model: printer.model,
          location: printer.location,
          alertKey: `consumable:${consumable.type}:${consumable.name}`,
          alertType: 'consumable',
          severity,
          message: `${consumable.name} is ${consumable.levelState}${levelPer !== undefined ? ` (${levelPer}%)` : ''}`,
          lastValue: levelPer !== undefined ? String(levelPer) : consumable.levelState,
        });
      }
    }

    for (const tray of printer.paperTrays || []) {
      const state = (tray.levelState || '').toLowerCase();
      let severity: AlertSeverity | null = null;

      if (state === 'empty') {
        severity = 'critical';
      } else if (state === 'nearempty') {
        severity = 'warning';
      }

      if (severity) {
        issues.push({
          printerId: printer.printerId,
          ipAddress: printer.ipAddress,
          model: printer.model,
          location: printer.location,
          alertKey: `tray:${tray.trayId}`,
          alertType: 'tray',
          severity,
          message: `${tray.name} is ${tray.levelState}`,
          lastValue: tray.levelState,
        });
      }
    }

    return issues;
  }

  private shouldNotify(
    existingState: EquipmentPrinterAlertState | undefined,
    severity: AlertSeverity,
    cooldownMinutes: number,
  ): boolean {
    if (!existingState || !existingState.is_active) {
      return true;
    }

    const existingRank = this.severityRank(existingState.severity);
    const nextRank = this.severityRank(severity);
    if (nextRank > existingRank) {
      return true;
    }

    if (!existingState.last_notified_at) {
      return true;
    }

    const lastNotifiedAt = new Date(existingState.last_notified_at).getTime();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastNotifiedAt >= cooldownMs;
  }

  private severityRank(severity: AlertSeverity): number {
    return severity === 'critical' ? 2 : 1;
  }

  private async sendAlertEmail(issues: PrinterAlertIssue[], recipients: string[]): Promise<void> {
    if (recipients.length === 0) {
      this.logger.warn('Printer alerts found but no scheduled-job recipients are configured; skipping email send.');
      return;
    }

    const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
    const subject = `[Printer Alerts] ${criticalCount} critical, ${warningCount} warning`;

    const html = this.emailTemplateService.render('equipment-printer-alert', {
      totalCount: issues.length,
      criticalCount,
      warningCount,
      issues: issues.map((issue) => ({
        alertType: issue.alertType,
        model: issue.model,
        location: issue.location || '-',
        ipAddress: issue.ipAddress,
        severity: issue.severity,
        isCritical: issue.severity === 'critical',
        message: issue.message,
        hasLevelPercent: this.toPercent(issue.lastValue) !== null,
        levelPercent: this.toPercent(issue.lastValue),
        levelBarColor: issue.severity === 'critical' ? '#b91c1c' : '#92400e',
      })),
    });

    await this.emailService.sendMail({
      to: recipients,
      subject,
      html,
    });
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toPercent(rawValue: string | undefined): number | null {
    if (rawValue === undefined || rawValue === null) {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    const clamped = Math.max(0, Math.min(100, parsed));
    return Math.round(clamped);
  }

  private toCompositeKey(printerId: number, alertKey: string): string {
    return `${printerId}::${alertKey}`;
  }
}
