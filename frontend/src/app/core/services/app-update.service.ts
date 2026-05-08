import { Injectable, inject, OnDestroy } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { BehaviorSubject, filter, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService implements OnDestroy {
  private swUpdate = inject(SwUpdate);

  private updateAvailableSubject = new BehaviorSubject<boolean>(false);
  public updateAvailable$ = this.updateAvailableSubject.asObservable();

  private isShowingBanner = false;
  private updateCheckTimeout: any = null;
  private pendingUpdates = 0;
  private periodicCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private versionUpdatesSubscription: Subscription | null = null;

  public initializeUpdateChecking(): void {
    if (!this.swUpdate.isEnabled) {
      console.warn('⚠️ Service Worker is NOT enabled. PWA updates will not work.');
      return;
    }

    // If we just applied an update, skip immediate check
    const updateApplied = sessionStorage.getItem('sw-update-applied');
    if (updateApplied) {
      const timeSinceUpdate = Date.now() - parseInt(updateApplied);
      if (timeSinceUpdate < 30000) {
        console.log('✅ Update was just applied, skipping immediate check');
        sessionStorage.removeItem('sw-update-applied');
        this.versionUpdatesSubscription = this.swUpdate.versionUpdates.pipe(
          filter((event): event is VersionEvent => true)
        ).subscribe(this.handleVersionEvent.bind(this));
        return;
      }
      sessionStorage.removeItem('sw-update-applied');
    }

    // Subscribe to version update events
    this.versionUpdatesSubscription = this.swUpdate.versionUpdates.pipe(
      filter((event): event is VersionEvent => true)
    ).subscribe(this.handleVersionEvent.bind(this));

    // Check once every 24 hours
    this.periodicCheckIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, 24 * 60 * 60 * 1000);

    // Initial check during idle time
    this.checkForUpdates();
  }

  private checkForUpdates(): void {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => this.performUpdateCheck(), { timeout: 30000 });
    } else {
      setTimeout(() => this.performUpdateCheck(), 1000);
    }
  }

  private async performUpdateCheck(): Promise<void> {
    try {
      await this.swUpdate.checkForUpdate();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  private handleVersionEvent(event: VersionEvent): void {
    switch (event.type) {
      case 'VERSION_DETECTED':
        console.log('🔍 New version detected, waiting for it to be ready...');
        this.pendingUpdates++;

        if (this.updateCheckTimeout) {
          clearTimeout(this.updateCheckTimeout);
        }
        break;

      case 'VERSION_READY':
        console.log('✅ New version is ready for activation');
        this.updateAvailableSubject.next(true);

        if (this.updateCheckTimeout) {
          clearTimeout(this.updateCheckTimeout);
        }

        // Wait 3 seconds after the last VERSION_READY before showing the banner
        // This allows multiple versions to be detected without multiple prompts
        this.updateCheckTimeout = setTimeout(() => {
          if (!this.isShowingBanner) {
            console.log(`🚀 All updates ready. Showing banner for ${this.pendingUpdates} version(s)`);
            this.isShowingBanner = true;
          }
        }, 3000);
        break;

      case 'VERSION_INSTALLATION_FAILED':
        console.error('❌ Version installation failed');
        this.isShowingBanner = false;
        this.pendingUpdates = 0;
        this.updateAvailableSubject.next(false);

        if (this.updateCheckTimeout) {
          clearTimeout(this.updateCheckTimeout);
          this.updateCheckTimeout = null;
        }
        break;

      case 'NO_NEW_VERSION_DETECTED':
        console.log('ℹ️ No new version available');
        break;

      default:
        break;
    }
  }

  public async activateAndReload(): Promise<void> {
    this.pendingUpdates = 0;
    this.updateAvailableSubject.next(false);

    try {
      const activated = await this.swUpdate.activateUpdate();
      console.log('✅ Update activated:', activated);
    } catch (err) {
      console.error('❌ Update activation failed:', err);
    }

    sessionStorage.setItem('sw-update-applied', Date.now().toString());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  ngOnDestroy(): void {
    this.versionUpdatesSubscription?.unsubscribe();
    if (this.periodicCheckIntervalId) clearInterval(this.periodicCheckIntervalId);
    if (this.updateCheckTimeout) clearTimeout(this.updateCheckTimeout);
  }
}
