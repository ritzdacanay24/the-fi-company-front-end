import { Injectable } from '@nestjs/common';
import { MrAlertPreferencesRepository, MrAlertPreferenceRow } from './mr-alert-preferences.repository';

export interface MrAlertPreferencesPayload {
  monitorEnabled: boolean;
  enabled: boolean;
  soundEnabled: boolean;
  repeatSeconds: number;
  queues: 'both' | 'picking' | 'validation';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

@Injectable()
export class MrAlertPreferencesService {
  constructor(private readonly repo: MrAlertPreferencesRepository) {}

  private normalizeTime(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    const text = String(value).trim();
    if (!text) {
      return null;
    }

    const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
    if (hhmm) {
      return text;
    }

    const hhmmss = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(text);
    if (hhmmss) {
      return `${hhmmss[1]}:${hhmmss[2]}`;
    }

    return null;
  }

  private normalizeRepeatSeconds(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 30;
    }

    if (parsed <= 30) {
      return 30;
    }

    if (parsed <= 60) {
      return 60;
    }

    if (parsed <= 120) {
      return 120;
    }

    return 300;
  }

  private normalizeQueues(value: unknown): 'both' | 'picking' | 'validation' {
    const normalized = String(value ?? '').toLowerCase();
    if (normalized === 'picking' || normalized === 'validation') {
      return normalized;
    }
    return 'both';
  }

  private mapRow(row: MrAlertPreferenceRow): MrAlertPreferencesPayload {
    return {
      monitorEnabled: row.mr_alert_monitor_enabled !== 0,
      enabled: row.mr_alert_enabled === 1,
      soundEnabled: row.mr_alert_sound_enabled === 1,
      repeatSeconds: this.normalizeRepeatSeconds(row.mr_alert_repeat_seconds),
      queues: this.normalizeQueues(row.mr_alert_queues),
      quietHoursStart: this.normalizeTime(row.mr_alert_quiet_hours_start),
      quietHoursEnd: this.normalizeTime(row.mr_alert_quiet_hours_end),
    };
  }

  async getMyPreferences(userId: number): Promise<MrAlertPreferencesPayload> {
    let row = await this.repo.getByUserId(userId);
    if (!row) {
      await this.repo.createDefault(userId);
      row = await this.repo.getByUserId(userId);
    }

    if (!row) {
      return {
        monitorEnabled: false,
        enabled: true,
        soundEnabled: true,
        repeatSeconds: 30,
        queues: 'both',
        quietHoursStart: null,
        quietHoursEnd: null,
      };
    }

    return this.mapRow(row);
  }

  async updateMyPreferences(userId: number, payload: Partial<MrAlertPreferencesPayload>): Promise<MrAlertPreferencesPayload> {
    const existing = await this.getMyPreferences(userId);

    const next: MrAlertPreferencesPayload = {
      monitorEnabled: payload.monitorEnabled ?? existing.monitorEnabled,
      enabled: payload.enabled ?? existing.enabled,
      soundEnabled: payload.soundEnabled ?? existing.soundEnabled,
      repeatSeconds: this.normalizeRepeatSeconds(payload.repeatSeconds ?? existing.repeatSeconds),
      queues: this.normalizeQueues(payload.queues ?? existing.queues),
      quietHoursStart: this.normalizeTime(payload.quietHoursStart ?? existing.quietHoursStart),
      quietHoursEnd: this.normalizeTime(payload.quietHoursEnd ?? existing.quietHoursEnd),
    };

    await this.repo.updateByUserId(userId, {
      mr_alert_monitor_enabled: next.monitorEnabled ? 1 : 0,
      mr_alert_enabled: next.enabled ? 1 : 0,
      mr_alert_sound_enabled: next.soundEnabled ? 1 : 0,
      mr_alert_repeat_seconds: next.repeatSeconds,
      mr_alert_queues: next.queues,
      mr_alert_quiet_hours_start: next.quietHoursStart,
      mr_alert_quiet_hours_end: next.quietHoursEnd,
    });

    return next;
  }
}
