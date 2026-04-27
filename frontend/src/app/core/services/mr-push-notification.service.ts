import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

type PushPermissionState = NotificationPermission | 'unsupported';

interface PushStatusResponse {
  supported: boolean;
  publicKey: string;
  subscribed: boolean;
  permission: 'default' | 'denied' | 'granted' | 'unsupported';
}

@Injectable({
  providedIn: 'root',
})
export class MrPushNotificationService {
  private initialized = false;
  private publicKey = '';

  pushSupported = false;
  pushPermission: PushPermissionState = 'unsupported';
  pushSubscribed = false;
  pushLoading = false;
  pushStatusMessage = 'Push notifications are not initialized.';

  constructor(
    private readonly http: HttpClient,
    private readonly swPush: SwPush,
  ) {}

  get canEnablePush(): boolean {
    return this.pushSupported && this.pushPermission !== 'denied';
  }

  init(): void {
    if (this.initialized) {
      return;
    }

    this.pushSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator && this.swPush.isEnabled;
    this.pushPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

    if (!this.pushSupported) {
      this.pushStatusMessage = 'Push requires a production build served over HTTPS with service worker enabled.';
      this.initialized = true;
      return;
    }

    void this.loadStatus();
    this.initialized = true;
  }

  async enablePush(): Promise<void> {
    if (!this.pushSupported) {
      this.pushStatusMessage = 'Push is not available in this browser or build.';
      return;
    }

    this.pushLoading = true;
    try {
      const permission = await Notification.requestPermission();
      this.pushPermission = permission;

      if (permission !== 'granted') {
        this.pushSubscribed = false;
        this.pushStatusMessage = permission === 'denied'
          ? 'Push permission was denied in the browser.'
          : 'Push permission was dismissed.';
        return;
      }

      const key = await this.getPublicKey();
      let subscription = await firstValueFrom(this.swPush.subscription);

      if (!subscription) {
        subscription = await this.swPush.requestSubscription({ serverPublicKey: key });
      }

      await firstValueFrom(this.http.put('apiv2/push-notifications/me/subscription', subscription.toJSON()));
      this.pushSubscribed = true;
      this.pushStatusMessage = 'Push notifications are enabled for this browser.';
    } catch (error) {
      this.pushStatusMessage = `Failed to enable push notifications: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.pushLoading = false;
    }
  }

  async disablePush(): Promise<void> {
    if (!this.pushSupported) {
      return;
    }

    this.pushLoading = true;
    try {
      const subscription = await firstValueFrom(this.swPush.subscription);
      if (subscription) {
        await firstValueFrom(
          this.http.request('delete', 'apiv2/push-notifications/me/subscription', {
            body: { endpoint: subscription.endpoint },
          }),
        );
        await subscription.unsubscribe();
      }

      this.pushSubscribed = false;
      this.pushStatusMessage = 'Push notifications are disabled for this browser.';
    } catch (error) {
      this.pushStatusMessage = `Failed to disable push notifications: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.pushLoading = false;
    }
  }

  async sendTestPush(): Promise<void> {
    if (!this.pushSupported || !this.pushSubscribed) {
      this.pushStatusMessage = 'Enable push notifications first before sending a test.';
      return;
    }

    this.pushLoading = true;
    try {
      const result = await firstValueFrom(this.http.post<{ sent: number }>('apiv2/push-notifications/me/test', {}));
      this.pushStatusMessage = result.sent > 0
        ? 'Test push sent. Close the browser or minimize it and watch for the system notification.'
        : 'No active push subscription was found for this browser.';
    } catch (error) {
      this.pushStatusMessage = `Failed to send test push: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.pushLoading = false;
    }
  }

  private async loadStatus(): Promise<void> {
    this.pushLoading = true;
    try {
      const status = await firstValueFrom(this.http.get<PushStatusResponse>('apiv2/push-notifications/me/status'));
      this.publicKey = status.publicKey;
      this.pushSubscribed = status.subscribed;
      this.pushStatusMessage = status.subscribed
        ? 'Push notifications are already enabled for this browser.'
        : 'Push notifications are available but not enabled yet.';

      if (this.pushPermission === 'granted') {
        const subscription = await firstValueFrom(this.swPush.subscription);
        if (subscription) {
          await firstValueFrom(this.http.put('apiv2/push-notifications/me/subscription', subscription.toJSON()));
          this.pushSubscribed = true;
        }
      }
    } catch (error) {
      this.pushStatusMessage = `Unable to load push notification status: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.pushLoading = false;
    }
  }

  private async getPublicKey(): Promise<string> {
    if (this.publicKey) {
      return this.publicKey;
    }

    const response = await firstValueFrom(this.http.get<{ publicKey: string }>('apiv2/push-notifications/public-key'));
    this.publicKey = response.publicKey;
    return this.publicKey;
  }
}