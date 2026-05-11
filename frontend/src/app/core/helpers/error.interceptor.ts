import { Inject, Injectable, Injector } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from "@angular/common/http";
import { BehaviorSubject, Observable, throwError, timer } from "rxjs";
import { catchError, filter, switchMap, take } from "rxjs/operators";
import { AuthenticationService } from "../services/auth.service";
import { THE_FI_COMPANY_TWOSTEP_TOKEN } from "../guards/admin.guard";
import { NotificationService } from "../services/notification.service";
import { Router } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AccessControlApiService } from "../api/access-control/access-control.service";
import { PermissionRequiredComponent, PermissionRequiredData } from "../../shared/modals/permission-required/permission-required.component";
import { DeployStatusService } from "../services/deploy-status.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isPermissionModalOpen = false;
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private authenticationService: AuthenticationService,
    @Inject(Injector) private readonly injector: Injector,
    private router: Router,
    private modalService: NgbModal,
  ) {}

  private get notificationService() {
    return this.injector.get(NotificationService);
  }

  private get accessControlService() {
    return this.injector.get(AccessControlApiService);
  }

  private get deployStatusService() {
    return this.injector.get(DeployStatusService);
  }

  private getRetryAfterSeconds(error: HttpErrorResponse): number {
    const headerValue = error.headers?.get('Retry-After');
    const payloadValue = Number(error?.error?.retryAfterSeconds || 0);
    const headerSeconds = Number(headerValue || 0);
    const raw = Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : payloadValue;
    if (!Number.isFinite(raw) || raw < 1) {
      return 15;
    }

    return Math.min(Math.round(raw), 300);
  }

  private isDeployInProgressError(error: HttpErrorResponse): boolean {
    return error.status === 503 && (
      error?.error?.deployInProgress === true
      || typeof error?.error?.retryAfterSeconds !== 'undefined'
      || String(error?.error?.message || '').toLowerCase().includes('deploy')
    );
  }

  private shouldAutoRetryDeployRequest(request: HttpRequest<any>): boolean {
    if (request.headers.has('x-deploy-retry')) {
      return false;
    }

    return !request.url.includes('/health/deploy-status');
  }

  private isLikelyDeployDowntimeError(error: HttpErrorResponse): boolean {
    const status = Number(error?.status || 0);
    const deploying = this.deployStatusService.snapshot.deploying === true;
    return deploying && (status === 0 || status === 502 || status === 503 || status === 504);
  }

  private async showPermissionRequiredModal(details: any, canRequest: boolean): Promise<void> {
    if (this.isPermissionModalOpen) {
      return;
    }

    this.isPermissionModalOpen = true;

    console.log('🔐 Showing permission required modal', { details, canRequest });
    
    const user = this.authenticationService.currentUserValue;
    const userName = [user?.first, user?.last].filter(Boolean).join(' ');

    const failedCheck = details?.failedCheck === 'role' ? 'role' : 'permission';
    const message = details?.message || 'You do not have permission to perform this action.';

    const modalData: PermissionRequiredData = {
      message,
      failedCheck,
      requiredDomain: details?.requiredDomain,
      configuredModuleDomain: details?.configuredModuleDomain,
      moduleKey: details?.moduleKey,
      requiredRoles: details?.requiredRoles || [],
      requiredPermissions: details?.requiredPermissions || [],
      currentRoles: details?.currentRoles || [],
      currentPermissions: details?.currentPermissions || [],
      currentDomainGrants: details?.currentDomainGrants || [],
      userName,
      canRequest,
    };

    console.log('🔐 Modal data prepared:', modalData);

    const modalRef = this.modalService.open(PermissionRequiredComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    console.log('🔐 Modal ref created:', modalRef);

    modalRef.componentInstance.data = modalData;

    try {
      const result = await modalRef.result;
      console.log('🔐 Modal result:', result);
      if (result?.action === 'request') {
        await this.handlePermissionRequest(details, result.reason);
      }
    } catch (dismissReason) {
      // Modal was dismissed, not confirmed
      console.log('🔐 Modal dismissed:', dismissReason);
      return;
    } finally {
      this.isPermissionModalOpen = false;
    }
  }

  private async handlePermissionRequest(details: any, reason: string | null) {
    const user = this.authenticationService.currentUserValue;
    const userId = user?.id || 0;
    const permissionName = details.requiredPermissions[0];
    const domain = details.requiredDomain;

    try {
      const permissions = await this.accessControlService.getPermissions();
      const permission = permissions.find((p: any) => p.name === permissionName);

      if (!permission) {
        this.notificationService.error('Could not find permission in system. Please contact your administrator.', false);
        return;
      }

      await this.accessControlService.submitPermissionRequest({
        userId,
        permissionId: permission.id,
        domain,
        reason,
      });

      this.notificationService.success('Your access request has been submitted to your administrator for approval.');
    } catch (err) {
      console.error('Error submitting permission request:', err);
      this.notificationService.error('Failed to submit access request. Please try again.', false);
    }
  }

  private handleTokenExpired(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authenticationService.refreshToken().pipe(
        switchMap((newToken) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(newToken);
          const retried = request.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` },
          });
          return next.handle(retried);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          localStorage.removeItem(THE_FI_COMPANY_TWOSTEP_TOKEN);
          this.authenticationService.logout();
          this.router.navigateByUrl('/auth/login');
          return throwError(err);
        }),
      );
    }

    // Another request already triggered a refresh — wait for the new token
    return this.refreshTokenSubject.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((token) => {
        const retried = request.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });
        return next.handle(retried);
      }),
    );
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error) => {
        const isDeployInProgress = this.isDeployInProgressError(error);
        const isDeployDowntime = this.isLikelyDeployDowntimeError(error);

        if (isDeployInProgress) {
          const retryAfterSeconds = this.getRetryAfterSeconds(error);
          const message = error?.error?.message || 'A new version is currently being deployed. Please retry in a moment.';
          this.deployStatusService.markDeploying(message, retryAfterSeconds);

          if (this.shouldAutoRetryDeployRequest(request)) {
            const retryRequest = request.clone({ setHeaders: { 'x-deploy-retry': '1' } });
            return timer(retryAfterSeconds * 1000).pipe(switchMap(() => next.handle(retryRequest)));
          }
        }

        if (request.url.includes('/auth/login') || request.url.includes('/auth/login/card')) {
          return throwError(() => error);
        }

        if (error.status === 401 || error.status === 900) {
          if (error.url?.includes("api.mindee.net")) {
            // Mindee API error - don't trigger app logout
            console.warn('Mindee API authentication error:', error.error);
          } else if (error.url?.includes('/auth/refresh')) {
            // Refresh call itself failed — give up and log out
            localStorage.removeItem(THE_FI_COMPANY_TWOSTEP_TOKEN);
            this.authenticationService.logout();
            this.router.navigateByUrl("/auth/login");
          } else {
            // Try to refresh silently before logging out
            return this.handleTokenExpired(request, next);
          }
        }

        if (error.status === 403) {
          console.log('🚫 403 Forbidden error caught:', error);
          const details = typeof error?.error === 'object' && error?.error !== null ? error.error : {};
          const canRequest = Array.isArray(details?.requiredPermissions) &&
            details.requiredPermissions.length > 0 &&
            !!details?.requiredDomain;

          console.log('🚫 Permission details:', { details, canRequest });

          // Fire modal without blocking
          this.showPermissionRequiredModal(details, canRequest).catch(err => {
            console.error('❌ Error showing permission modal:', err);
          });

          return throwError(error);
        }

        let errorMessage =
          typeof error?.error === "object" && error?.error !== null
            ? error?.error?.message
            : error?.statusText;

        // Check for suppress flags from our serial number component
        const suppressGlobalError =
          error?._suppressGlobalError
          || error?._handledLocally
          || isDeployInProgress
          || isDeployDowntime;

        // Only show toast if backend did not set showPopup === false AND we haven't suppressed it
        if (
          !suppressGlobalError &&
          (typeof error?.error !== "object" ||
          error?.error?.showPopup !== false)
        ) {
          this.notificationService.error(error);
        }
        return throwError(error);
      })
    );
  }
}
