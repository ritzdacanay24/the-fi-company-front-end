import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface MrAlertPreferenceRow extends RowDataPacket {
  id: number;
  user_id: number;
  mr_alert_monitor_enabled: number;
  mr_alert_enabled: number;
  mr_alert_sound_enabled: number;
  mr_alert_repeat_seconds: number;
  mr_alert_queues: 'both' | 'picking' | 'validation';
  mr_alert_quiet_hours_start: string | null;
  mr_alert_quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MrAlertPreferencesRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getByUserId(userId: number): Promise<MrAlertPreferenceRow | null> {
    const rows = await this.mysqlService.query<MrAlertPreferenceRow[]>(
      `SELECT * FROM mr_alert_preferences WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async createDefault(userId: number): Promise<void> {
    await this.mysqlService.query(
      `INSERT INTO mr_alert_preferences (
        user_id,
        mr_alert_monitor_enabled,
        mr_alert_enabled,
        mr_alert_sound_enabled,
        mr_alert_repeat_seconds,
        mr_alert_queues,
        mr_alert_quiet_hours_start,
        mr_alert_quiet_hours_end
      ) VALUES (?, 0, 1, 1, 30, 'both', NULL, NULL)`,
      [userId],
    );
  }

  async updateByUserId(userId: number, patch: Record<string, unknown>): Promise<void> {
    const entries = Object.entries(patch);
    if (entries.length === 0) {
      return;
    }

    const sql = `UPDATE mr_alert_preferences SET ${entries
      .map(([key]) => `${key} = ?`)
      .join(', ')} WHERE user_id = ?`;

    await this.mysqlService.query(sql, [...entries.map(([, value]) => value), userId]);
  }
}
