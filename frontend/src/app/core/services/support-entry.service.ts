import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { AuthenticationService } from './auth.service';
import { ErrorReportDialogService } from './error-report-dialog.service';
import { TicketPriority, TicketType } from '@app/shared/interfaces/ticket.interface';

export interface SupportEntryOptions {
  source: string;
  dashboardTitle?: string;
  dashboardType?: TicketType;
  dashboardPriority?: TicketPriority;
}

@Injectable({
  providedIn: 'root',
})
export class SupportEntryService {
  private readonly itSupportUrl = 'https://averro.service-now.com/';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthenticationService,
    private readonly errorReportDialogService: ErrorReportDialogService,
  ) {}

  async openSupport(options: SupportEntryOptions): Promise<void> {
    const selection = await SweetAlert.fire({
      title: 'What do you need help with?',
      html: 'Choose <strong>Dashboard / App</strong> for application workflow issues or <strong>IT / Access</strong> for account, network, or device issues.',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Dashboard / App',
      denyButtonText: 'IT / Access',
      cancelButtonText: 'Cancel',
    });

    if (selection.isConfirmed) {
      await this.openDashboardSupport(options);
      return;
    }

    if (selection.isDenied) {
      window.open(this.itSupportUrl, '_blank');
    }
  }

  private async openDashboardSupport(options: SupportEntryOptions): Promise<void> {
    const defaults = {
      type: options.dashboardType || TicketType.INCIDENT_OUTAGE,
      priority: options.dashboardPriority || TicketPriority.HIGH,
      title: options.dashboardTitle || 'Dashboard Support Request',
    };

    if (this.authService.currentUserValue) {
      await this.errorReportDialogService.open(defaults);
      return;
    }

    await this.router.navigate(['/support'], {
      queryParams: {
        source: options.source,
        category: 'dashboard_app',
        type: defaults.type,
        priority: defaults.priority,
        title: defaults.title,
      },
    });
  }
}