import { Injectable, OnDestroy, signal } from '@angular/core';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

/**
 * Browser Health Monitor
 * Detects browser updates, crashes, and connectivity issues
 * Prompts users to refresh when browser state is stale
 */
@Injectable({
  providedIn: 'root'
})
export class BrowserHealthService implements OnDestroy {
  private browserUpdateCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private sessionAgeCheckIntervalId: ReturnType<typeof setInterval> | null = null;

  // Track consecutive failures
  private consecutiveFailures = signal(0);
  private lastSuccessfulRequest = signal(Date.now());
  private isShowingRefreshPrompt = false;

  /**
   * Initialize browser health monitoring
   */
  initialize(): void {
    this.detectBrowserUpdates();
    this.monitorSessionAge();
  }

  /**
   * Detect if browser was updated while app is running
   */
  private detectBrowserUpdates(): void {
    const initialVersion = this.getBrowserVersion();

    if (this.browserUpdateCheckIntervalId) {
      clearInterval(this.browserUpdateCheckIntervalId);
    }

    this.browserUpdateCheckIntervalId = setInterval(() => {
      const currentVersion = this.getBrowserVersion();
      if (currentVersion && initialVersion && currentVersion !== initialVersion) {
        console.warn('Browser version changed during session:', {
          initial: initialVersion,
          current: currentVersion
        });
        this.promptBrowserRefresh('Browser Update Detected');
      }
    }, 60000); // Check every minute
  }

  /**
   * Get browser version string for Chrome or Edge
   */
  private getBrowserVersion(): string | null {
    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    const edgeMatch = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    return chromeMatch?.[1] || edgeMatch?.[1] || null;
  }

  /**
   * Monitor session age and suggest refresh for very long sessions
   */
  private monitorSessionAge(): void {
    const sessionStart = Date.now();

    if (this.sessionAgeCheckIntervalId) {
      clearInterval(this.sessionAgeCheckIntervalId);
    }

    this.sessionAgeCheckIntervalId = setInterval(() => {
      const sessionAge = Date.now() - sessionStart;
      const hoursSinceStart = sessionAge / (1000 * 60 * 60);

      // Suggest refresh after 8 hours of continuous use
      if (hoursSinceStart >= 8 && !this.isShowingRefreshPrompt) {
        console.log('Long session detected:', hoursSinceStart.toFixed(1), 'hours');
        this.promptBrowserRefresh('Long Session', false); // Optional refresh
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  ngOnDestroy(): void {
    if (this.browserUpdateCheckIntervalId) {
      clearInterval(this.browserUpdateCheckIntervalId);
      this.browserUpdateCheckIntervalId = null;
    }

    if (this.sessionAgeCheckIntervalId) {
      clearInterval(this.sessionAgeCheckIntervalId);
      this.sessionAgeCheckIntervalId = null;
    }
  }

  /**
   * Report a successful HTTP request — resets the failure counter
   */
  reportSuccess(): void {
    this.consecutiveFailures.set(0);
    this.lastSuccessfulRequest.set(Date.now());
  }

  /**
   * Report a failed HTTP request — triggers refresh prompt after 5 consecutive failures
   */
  reportFailure(): void {
    const failures = this.consecutiveFailures() + 1;
    this.consecutiveFailures.set(failures);

    if (failures >= 5 && !this.isShowingRefreshPrompt) {
      const timeSinceSuccess = Date.now() - this.lastSuccessfulRequest();
      const minutesSinceSuccess = Math.floor(timeSinceSuccess / 60000);

      console.warn('Multiple request failures detected:', {
        consecutiveFailures: failures,
        minutesSinceLastSuccess: minutesSinceSuccess
      });

      this.promptBrowserRefresh('Connection Issues Detected');
    }
  }

  /**
   * Prompt user to refresh browser
   */
  private async promptBrowserRefresh(reason: string, required: boolean = true): Promise<void> {
    if (this.isShowingRefreshPrompt) return;
    this.isShowingRefreshPrompt = true;

    try {
      const result = await SweetAlert.fire({
        icon: 'warning',
        title: reason,
        html: `
          <div class="text-center">
            <div class="mb-3">
              <i class="ri-refresh-line fs-1 text-warning"></i>
            </div>
            <p class="mb-2">Your browser may need to be refreshed for optimal performance.</p>
            <p class="text-muted small mb-0">
              ${required
                ? 'This will reload the page and clear any temporary issues.'
                : 'Refreshing periodically helps maintain app stability.'
              }
            </p>
          </div>
        `,
        showCancelButton: !required,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: '<i class="ri-refresh-line me-2"></i>Refresh Now',
        cancelButtonText: 'Later',
        confirmButtonColor: '#f39c12'
      });

      if (result.isConfirmed) {
        window.location.reload();
      } else if (!required) {
        // User declined optional refresh — reset failure counter
        this.consecutiveFailures.set(0);
      }
    } finally {
      this.isShowingRefreshPrompt = false;
    }
  }
}
