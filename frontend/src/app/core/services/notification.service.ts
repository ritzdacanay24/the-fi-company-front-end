import { Injectable, inject, Inject, Injector } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { getErrorMessage } from '@app/shared/utils/error-handling.util';
import { ErrorReportDialogService } from './error-report-dialog.service';
import { ErrorSnackbarComponent } from '@app/core/components/error-snackbar/error-snackbar.component';
import { TicketType } from '@app/shared/interfaces/ticket.interface';

/**
 * Centralized notification service using Material Snackbar.
 * Errors show a custom snackbar with a "Report Issue" button that opens the ticket dialog.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  constructor(@Inject(Injector) private readonly injector: Injector) {}

  /** Lazy getter — breaks circular dep: NotificationService ↔ ErrorReportDialogService */
  private get errorReportDialog(): ErrorReportDialogService {
    return this.injector.get(ErrorReportDialogService);
  }

  clear(): void {
    this.snackBar.dismiss();
  }

  /**
   * Show error snackbar with optional "Report Issue" action.
   * Clicking "Report Issue" pre-fills and opens the ticket submit dialog.
   */
  error(error: unknown, showReportIssue: boolean = true): void {
    const message = getErrorMessage(error);
    this.snackBar.dismiss();

    const snackBarRef = this.snackBar.openFromComponent(ErrorSnackbarComponent, {
      data: { message, showReportIssue },
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });

    if (showReportIssue) {
      snackBarRef.onAction().subscribe(() => {
        const currentUrl = window.location.href;
        const currentRoute = this.router.url;

        let description = `**Error Message:**\n${message}\n\n`;

        if (error instanceof HttpErrorResponse) {
          description += `**HTTP Details:**\n`;
          description += `- Status: ${error.status}\n`;
          description += `- Endpoint: ${error.url || 'N/A'}\n\n`;
        }

        description += `**Page URL:**\n${currentUrl}\n\n`;
        description += `**Route:**\n${currentRoute}\n\n`;
        description += `**Additional Details:**\nPlease describe what you were doing when this error occurred.`;

        const defaultTitle = message.length > 50 ? `${message.substring(0, 47)}...` : message;

        void this.errorReportDialog.open({
          type: TicketType.BUG,
          title: `Error: ${defaultTitle}`,
          description,
        });
      });
    }
  }

  /** Show success snackbar (auto-dismisses after 5s) */
  success(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  /** Show info snackbar (auto-dismisses after 3s) */
  info(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  /** Show warning snackbar (persists until dismissed) */
  warning(message: string): void {
    this.snackBar.open(message, 'Close', {
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
