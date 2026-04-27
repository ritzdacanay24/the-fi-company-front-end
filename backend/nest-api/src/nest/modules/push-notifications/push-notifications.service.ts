import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, { PushSubscription } from 'web-push';
import {
  PushNotificationsRepository,
  PushSubscriptionRow,
} from './push-notifications.repository';

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export interface PushSubscriptionStatusPayload {
  supported: boolean;
  publicKey: string;
  subscribed: boolean;
  permission: 'default' | 'denied' | 'granted' | 'unsupported';
}

interface MrAlertPushSnapshot {
  pendingPickingCount: number;
  pendingValidationCount: number;
}

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;

  constructor(
    private readonly repo: PushNotificationsRepository,
    private readonly configService: ConfigService,
  ) {
    const envPublicKey = this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC_KEY');
    const envPrivateKey = this.configService.get<string>('WEB_PUSH_VAPID_PRIVATE_KEY');

    if (envPublicKey && envPrivateKey) {
      this.vapidPublicKey = envPublicKey;
      this.vapidPrivateKey = envPrivateKey;
    } else {
      const generatedKeys = webpush.generateVAPIDKeys();
      this.vapidPublicKey = generatedKeys.publicKey;
      this.vapidPrivateKey = generatedKeys.privateKey;
      this.logger.warn(
        'WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY are not set. Using ephemeral VAPID keys for this process only.',
      );
    }

    webpush.setVapidDetails(
      this.configService.get<string>('WEB_PUSH_CONTACT_EMAIL') || 'mailto:alerts@eye-fi.com',
      this.vapidPublicKey,
      this.vapidPrivateKey,
    );
  }

  private normalizeSubscription(payload: PushSubscriptionPayload): PushSubscriptionPayload {
    return {
      endpoint: String(payload.endpoint || '').trim(),
      expirationTime: payload.expirationTime ?? null,
      keys: {
        p256dh: String(payload.keys?.p256dh || '').trim(),
        auth: String(payload.keys?.auth || '').trim(),
      },
    };
  }

  private toWebPushSubscription(row: PushSubscriptionRow): PushSubscription {
    return {
      endpoint: row.endpoint,
      expirationTime: row.expiration_time,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth_key,
      },
    };
  }

  private buildNotificationPayload(title: string, body: string, url: string, tag: string): string {
    return JSON.stringify({
      notification: {
        title,
        body,
        icon: '/assets/images/logo-sm.png',
        badge: '/assets/images/logo-sm.png',
        vibrate: [300, 150, 300],
        tag,
        renotify: true,
        requireInteraction: true,
        data: {
          url,
          onActionClick: {
            default: {
              operation: 'openWindow',
              url,
            },
          },
        },
      },
    });
  }

  private async sendToRows(rows: PushSubscriptionRow[], payload: string): Promise<number> {
    let sentCount = 0;

    for (const row of rows) {
      try {
        await webpush.sendNotification(this.toWebPushSubscription(row), payload);
        sentCount += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await this.repo.deleteSubscriptionByEndpoint(row.endpoint);
        }
        this.logger.warn(
          `Failed to send push notification to user ${row.user_id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return sentCount;
  }

  async getStatus(userId: number): Promise<PushSubscriptionStatusPayload> {
    const subscriptions = await this.repo.listByUserId(userId);
    return {
      supported: true,
      publicKey: this.vapidPublicKey,
      subscribed: subscriptions.length > 0,
      permission: 'default',
    };
  }

  getPublicKey(): string {
    return this.vapidPublicKey;
  }

  async saveMySubscription(userId: number, payload: PushSubscriptionPayload, userAgent?: string): Promise<void> {
    const subscription = this.normalizeSubscription(payload);
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error('Invalid push subscription payload');
    }

    await this.repo.upsertSubscription(userId, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: subscription.expirationTime ?? null,
      userAgent: userAgent ?? null,
    });
  }

  async deleteMySubscription(userId: number, endpoint: string): Promise<void> {
    if (!endpoint) {
      return;
    }

    await this.repo.deleteSubscription(userId, endpoint);
  }

  async sendTestNotification(userId: number): Promise<{ sent: number }> {
    const rows = await this.repo.listByUserId(userId);
    if (rows.length === 0) {
      return { sent: 0 };
    }

    const payload = this.buildNotificationPayload(
      'Eye-Fi Push Test',
      'Web push is working. If the browser is closed, the OS should still show this notification.',
      '/operations/material-request/picking',
      'mr-push-test',
    );

    return {
      sent: await this.sendToRows(rows, payload),
    };
  }

  async sendMaterialRequestAlert(reason: string, snapshot: MrAlertPushSnapshot): Promise<void> {
    const rows = await this.repo.listMrAlertRecipients();
    if (rows.length === 0) {
      return;
    }

    const total = Number(snapshot.pendingPickingCount || 0) + Number(snapshot.pendingValidationCount || 0);
    if (total <= 0) {
      return;
    }

    const queueLabel = snapshot.pendingValidationCount > 0 ? 'validation' : 'picking';
    const url = snapshot.pendingValidationCount > 0
      ? '/operations/material-request/validate-list'
      : '/operations/material-request/picking';

    const payload = this.buildNotificationPayload(
      'Material Request Alert',
      `${total} pending material request alert${total === 1 ? '' : 's'} (${snapshot.pendingPickingCount} picking, ${snapshot.pendingValidationCount} validation) - ${reason}`,
      url,
      `mr-alert-${queueLabel}`,
    );

    await this.sendToRows(rows, payload);
  }
}