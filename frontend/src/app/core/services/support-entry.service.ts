import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from './auth.service';
import { ErrorReportDialogService } from './error-report-dialog.service';
import { TicketPriority, TicketType } from '@app/shared/interfaces/ticket.interface';
import { SupportEntryModalComponent, SupportEntrySelection } from '../components/support-entry-modal/support-entry-modal.component';

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
    private readonly modalService: NgbModal,
    private readonly authService: AuthenticationService,
    private readonly errorReportDialogService: ErrorReportDialogService,
  ) {}

  async openSupport(options: SupportEntryOptions): Promise<void> {
    const modalRef = this.modalService.open(SupportEntryModalComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: true,
      size: 'md',
    });

    let selection: SupportEntrySelection | null = null;
    try {
      selection = (await modalRef.result) as SupportEntrySelection;
    } catch {
      selection = null;
    }

    if (selection === 'dashboard') {
      await this.openDashboardSupport(options);
      return;
    }

    if (selection === 'it') {
      window.open(this.itSupportUrl, '_blank', 'noopener,noreferrer');
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