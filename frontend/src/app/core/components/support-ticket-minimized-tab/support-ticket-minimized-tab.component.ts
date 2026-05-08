import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SupportTicketDraftService } from '@app/core/services/support-ticket-draft.service';
import { ErrorReportDialogComponent } from '@app/core/components/error-report-dialog/error-report-dialog.component';

@Component({
  selector: 'app-support-ticket-minimized-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shouldShow()) {
      <button
        type="button"
        class="btn btn-primary position-fixed d-flex align-items-center gap-2"
        style="left: auto; right: 16px; bottom: 16px; z-index: 1055; border-radius: 999px;"
        (click)="restoreDraft()">
        <i class="mdi mdi-ticket"></i>
        <span class="small">Submit Ticket</span>
      </button>
    }
  `
})
export class SupportTicketMinimizedTabComponent {
  private readonly modalService = inject(NgbModal);
  private readonly draftService = inject(SupportTicketDraftService);

  shouldShow = computed(() => !!this.draftService.draft() && this.draftService.isMinimized());

  restoreDraft(): void {
    const draft = this.draftService.draft();
    if (!draft) return;

    this.draftService.restore();

    const modalRef = this.modalService.open(ErrorReportDialogComponent, {
      size: 'lg',
      backdrop: 'static',
      centered: true
    });

    const instance = modalRef.componentInstance as ErrorReportDialogComponent;
    instance.applyDraft(draft);

    void modalRef.result.then(
      () => {
        // Component clears draft on success/cancel.
      },
      (reason) => {
        if (reason !== 'minimized') {
          this.draftService.clearDraft();
        }
      }
    );
  }
}
