import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { createHash } from 'crypto';
import { MysqlService } from '@/shared/database/mysql.service';

export interface PushSubscriptionRow extends RowDataPacket {
  id: number;
  user_id: number;
  endpoint_hash: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  expiration_time: number | null;
  user_agent: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class PushNotificationsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  private hashEndpoint(endpoint: string): string {
    return createHash('sha256').update(endpoint).digest('hex');
  }

  async upsertSubscription(userId: number, subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
    expirationTime: number | null;
    userAgent: string | null;
  }): Promise<void> {
    const endpointHash = this.hashEndpoint(subscription.endpoint);
    await this.mysqlService.query(
      `INSERT INTO mr_push_subscriptions (
        user_id,
        endpoint_hash,
        endpoint,
        p256dh,
        auth_key,
        expiration_time,
        user_agent,
        last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        endpoint = VALUES(endpoint),
        p256dh = VALUES(p256dh),
        auth_key = VALUES(auth_key),
        expiration_time = VALUES(expiration_time),
        user_agent = VALUES(user_agent),
        last_used_at = NOW()`,
      [
        userId,
        endpointHash,
        subscription.endpoint,
        subscription.p256dh,
        subscription.auth,
        subscription.expirationTime,
        subscription.userAgent,
      ],
    );
  }

  async deleteSubscription(userId: number, endpoint: string): Promise<void> {
    await this.mysqlService.query(
      `DELETE FROM mr_push_subscriptions WHERE user_id = ? AND endpoint_hash = ?`,
      [userId, this.hashEndpoint(endpoint)],
    );
  }

  async deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await this.mysqlService.query(
      `DELETE FROM mr_push_subscriptions WHERE endpoint_hash = ?`,
      [this.hashEndpoint(endpoint)],
    );
  }

  async listByUserId(userId: number): Promise<PushSubscriptionRow[]> {
    return this.mysqlService.query<PushSubscriptionRow[]>(
      `SELECT * FROM mr_push_subscriptions WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId],
    );
  }

  async listMrAlertRecipients(): Promise<PushSubscriptionRow[]> {
    return this.mysqlService.query<PushSubscriptionRow[]>(
      `SELECT DISTINCT s.*
       FROM mr_push_subscriptions s
       LEFT JOIN mr_alert_preferences p ON p.user_id = s.user_id
       WHERE COALESCE(p.mr_alert_enabled, 1) = 1
         AND COALESCE(p.mr_alert_monitor_enabled, 0) = 1`,
    );
  }
}