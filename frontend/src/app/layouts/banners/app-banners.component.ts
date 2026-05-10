import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QadHealthStatusService } from '@app/core/services/qad-health-status.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { AppUpdateService } from '@app/core/services/app-update.service';
import { DeployStatusService } from '@app/core/services/deploy-status.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-banners.component.html',
})
export class AppBannersComponent implements OnInit, OnDestroy {
  @ViewChild('bannerContainer') bannerContainer?: ElementRef<HTMLElement>;

  private readonly qadHealth = inject(QadHealthStatusService);
  private readonly authService = inject(AuthenticationService);
  private readonly appUpdate = inject(AppUpdateService);
  private readonly deployStatus = inject(DeployStatusService);
  private readonly destroyRef = inject(DestroyRef);

  readonly enableQadBanner: boolean =
    environment.production ? true : (environment as any).showQadStatusBanner ?? false;

  isAuthenticated = false;
  isQadConnected = true;
  hasUpdateReady = false;
  isDeploying = false;
  deployMessage = 'A new version is currently being deployed. Please retry in a moment.';
  deployRetryAfterSeconds = 15;

  get showUpdateBanner(): boolean {
    return this.hasUpdateReady && this.isAuthenticated;
  }

  get showQadBanner(): boolean {
    return this.enableQadBanner && this.isAuthenticated && !this.isQadConnected && !this.showUpdateBanner;
  }

  get showDeployBanner(): boolean {
    return this.isDeploying;
  }

  ngOnInit(): void {
    this.isAuthenticated = !!this.authService.currentUserValue;

    // Subscribe to update availability from AppUpdateService
    this.appUpdate.updateAvailable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((available) => {
        this.hasUpdateReady = available;
        this.scheduleBannerLayoutSync();
      });

    this.qadHealth.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.isAuthenticated = !!this.authService.currentUserValue;
        this.isQadConnected = state.isConnected;
        this.scheduleBannerLayoutSync();
      });

    this.deployStatus.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.isDeploying = state.deploying === true;
        this.deployMessage = state.message || this.deployMessage;
        this.deployRetryAfterSeconds = state.retryAfterSeconds || this.deployRetryAfterSeconds;
        this.scheduleBannerLayoutSync();
      });
  }

  reloadSite(): void {
    void this.appUpdate.activateAndReload();
  }

  private scheduleBannerLayoutSync(): void {
    setTimeout(() => this.syncBannerLayoutOffset(), 0);
  }

  private syncBannerLayoutOffset(): void {
    const shouldShowBanner = this.showUpdateBanner || this.showDeployBanner || this.showQadBanner;

    if (!shouldShowBanner) {
      this.clearBannerLayoutOffset();
      return;
    }

    const bannerEl = this.bannerContainer?.nativeElement;
    const bannerHeight = bannerEl?.offsetHeight ?? 0;
    const safeHeight = bannerHeight > 0 ? bannerHeight : 48;

    document.body.classList.add('qad-validation-banner-visible');
    document.documentElement.style.setProperty('--qad-validation-banner-height', `${safeHeight}px`);
  }

  private clearBannerLayoutOffset(): void {
    document.body.classList.remove('qad-validation-banner-visible');
    document.documentElement.style.setProperty('--qad-validation-banner-height', '0px');
  }

  ngOnDestroy(): void {
    this.clearBannerLayoutOffset();
  }
}
