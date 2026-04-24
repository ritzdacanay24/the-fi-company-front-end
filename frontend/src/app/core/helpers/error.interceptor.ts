import { Inject, Injectable, Injector } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthenticationService } from "../services/auth.service";
import { ToastrService } from "ngx-toastr";
import { THE_FI_COMPANY_TWOSTEP_TOKEN } from "../guards/admin.guard";
import { Router } from "@angular/router";
import Swal from 'sweetalert2';
import { AccessControlApiService } from "../api/access-control/access-control.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authenticationService: AuthenticationService,
    @Inject(Injector) private readonly injector: Injector,
    private router: Router,
  ) {}

  private get toastService() {
    return this.injector.get(ToastrService);
  }

  private get accessControlService() {
    return this.injector.get(AccessControlApiService);
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private renderTagList(values: unknown[], emptyLabel: string): string {
    if (!Array.isArray(values) || values.length === 0) {
      return `<span class="text-muted">${this.escapeHtml(emptyLabel)}</span>`;
    }

    return values
      .map((value) => `<span class="badge bg-light text-dark border me-1 mb-1">${this.escapeHtml(value)}</span>`)
      .join('');
  }

  private renderGrantList(grants: Array<{ permission?: string; domain?: string; expiresAt?: string | null }>): string {
    if (!Array.isArray(grants) || grants.length === 0) {
      return '<span class="text-muted">None</span>';
    }

    return grants
      .map((grant) => {
        const permission = this.escapeHtml(grant?.permission || 'unknown');
        const domain = this.escapeHtml(grant?.domain || 'unknown');
        const expiry = grant?.expiresAt ? ` <span class="text-muted">until ${this.escapeHtml(grant.expiresAt)}</span>` : '';
        return `<div><span class="badge bg-light text-dark border me-1 mb-1">${permission} @ ${domain}</span>${expiry}</div>`;
      })
      .join('');
  }

  private buildForbiddenHtml(details: any, includeRequestForm: boolean = false): string {
    const user = this.authenticationService.currentUserValue;
    const userName = [user?.first, user?.last].filter(Boolean).join(' ');
    const message = this.escapeHtml(details?.message || 'You do not have permission to perform this action.');
    const failedCheck = details?.failedCheck === 'role' ? 'Missing required role' : 'Missing required permission';

    const requiredDomain = details?.requiredDomain
      ? `<div class="mb-2"><strong>Required domain:</strong> ${this.escapeHtml(details.requiredDomain)}</div>`
      : '';

    const configuredDomain = details?.configuredModuleDomain
      ? `<div class="mb-2"><strong>Configured module domain:</strong> ${this.escapeHtml(details.configuredModuleDomain)}${details?.moduleKey ? ` <span class="text-muted">(${this.escapeHtml(details.moduleKey)})</span>` : ''}</div>`
      : '';

    const requiredRolesHtml = (Array.isArray(details?.requiredRoles) && details.requiredRoles.length > 0)
      ? `<div class="mb-2"><strong>Required roles:</strong><br>${this.renderTagList(details.requiredRoles, 'None specified')}</div>`
      : '';

    const requiredPermissionsHtml = (Array.isArray(details?.requiredPermissions) && details.requiredPermissions.length > 0)
      ? `<div class="mb-3"><strong>Required permissions:</strong><br>${this.renderTagList(details.requiredPermissions, 'None specified')}</div>`
      : '';

    const requestForm = includeRequestForm ? `
      <hr class="my-3">
      <div class="text-start">
        <p class="small text-muted mb-2">Submit a request to your administrator:</p>
        <label for="swal-reason-input" class="form-label small fw-semibold">Reason <span class="text-muted fw-normal">(optional)</span></label>
        <textarea id="swal-reason-input" class="form-control form-control-sm" rows="2" placeholder="Explain why you need this access..."></textarea>
      </div>` : '';

    return `
      <div class="text-start">
        <p class="mb-2">${message}</p>
        <div class="small text-muted mb-3">${this.escapeHtml(failedCheck)}${userName ? ` for ${this.escapeHtml(userName)}` : ''}</div>
        ${requiredDomain}
        ${configuredDomain}
        ${requiredRolesHtml}
        ${requiredPermissionsHtml}
        <div class="mb-2"><strong>Your roles:</strong><br>${this.renderTagList(details?.currentRoles, 'No assigned RBAC roles')}</div>
        <div class="mb-2"><strong>Your permissions:</strong><br>${this.renderTagList(details?.currentPermissions, 'No assigned RBAC permissions')}</div>
        <div class="mb-0"><strong>Your active grants${details?.requiredDomain ? ` for ${this.escapeHtml(details.requiredDomain)}` : ''}:</strong><br>${this.renderGrantList(details?.currentDomainGrants || [])}</div>
        ${requestForm}
      </div>
    `;
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
        this.toastService.error('Could not find permission in system. Please contact your administrator.', 'Error');
        return;
      }

      await this.accessControlService.submitPermissionRequest({
        userId,
        permissionId: permission.id,
        domain,
        reason,
      });

      Swal.fire({
        icon: 'success',
        title: 'Request Submitted',
        text: 'Your access request has been submitted to your administrator for approval.',
        confirmButtonText: 'OK',
      });
    } catch (err) {
      console.error('Error submitting permission request:', err);
      this.toastService.error('Failed to submit access request. Please try again.', 'Error');
    }
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401 || error.status === 900) {
          // auto logout if 401 response returned from api
          if (error.url?.includes("api.mindee.net")) {
            // Mindee API error - don't trigger app logout
            console.warn('Mindee API authentication error:', error.error);
          } else {
            // Internal API error - trigger logout
            localStorage.removeItem(THE_FI_COMPANY_TWOSTEP_TOKEN);
            this.authenticationService.logout();
            this.router.navigateByUrl("/auth/login");
          }
        }

        if (error.status === 403) {
          const details = typeof error?.error === 'object' && error?.error !== null ? error.error : {};
          const canRequest = Array.isArray(details?.requiredPermissions) &&
            details.requiredPermissions.length > 0 &&
            !!details?.requiredDomain;

          Swal.fire({
            icon: 'warning',
            title: 'Permission Required',
            html: this.buildForbiddenHtml(details, canRequest),
            confirmButtonText: canRequest ? 'Request Access' : 'OK',
            confirmButtonColor: canRequest ? '#0d6efd' : '#6c757d',
            showCancelButton: canRequest,
            cancelButtonText: 'Close',
            cancelButtonColor: '#6c757d',
            focusConfirm: false,
            preConfirm: canRequest ? () => {
              const reasonInput = document.getElementById('swal-reason-input') as HTMLTextAreaElement;
              return reasonInput?.value || null;
            } : undefined,
          }).then(async (result) => {
            if (canRequest && result.isConfirmed) {
              await this.handlePermissionRequest(details, result.value ?? null);
            }
          });

          return throwError(error);
        }

        let errorMessage =
          typeof error?.error === "object" && error?.error !== null
            ? error?.error?.message
            : error?.statusText;

        // Check for suppress flags from our serial number component
        const suppressGlobalError = error?._suppressGlobalError || error?._handledLocally;

        // Only show toast if backend did not set showPopup === false AND we haven't suppressed it
        if (
          !suppressGlobalError &&
          (typeof error?.error !== "object" ||
          error?.error?.showPopup !== false)
        ) {
          this.toastService.error(errorMessage, error?.statusText, {
            timeOut: 100000000,
            newestOnTop: true,
          });
        }
        return throwError(error);
      })
    );
  }
}
