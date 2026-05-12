import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SupportTicketsService } from '@app/core/api/support-tickets/support-tickets.service';
import { NotificationService } from '@app/core/services/notification.service';
import { BreadcrumbComponent } from '@app/shared/components/breadcrumb/breadcrumb.component';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_TYPE_LABELS,
  SupportTicket,
  SupportTicketAttachment,
  SupportTicketComment,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketType,
} from '@app/shared/models/support-ticket.model';
import {
  TicketImpactLevel,
  TicketUrgencyLevel,
  TICKET_IMPACT_LABELS,
  TICKET_URGENCY_LABELS,
  TicketMetadata,
} from '@app/shared/interfaces/ticket.interface';
import moment from 'moment';
import { firstValueFrom } from 'rxjs';

type TicketMediaItem = {
  id: string;
  fileName: string;
  url: string;
  createdAt?: string | null;
  source: 'attachment' | 'screenshot';
};

@Component({
  selector: 'app-support-ticket-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BreadcrumbComponent],
  templateUrl: './support-ticket-detail.component.html',
  styles: [
    `
      .ticket-page-icon {
        width: 60px;
        height: 60px;
      }

      .app-page-title {
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .app-page-subtitle {
        font-size: 0.95rem;
      }

      .ticket-details-panel {
        background-color: var(--vz-card-bg, #ffffff) !important;
      }

      .ticket-details-panel .card-body {
        background-color: var(--vz-card-bg, #ffffff) !important;
      }

      .ticket-details-panel .card-header {
        background-color: var(--vz-card-cap-bg, var(--vz-card-bg, #ffffff)) !important;
      }

      :host-context([data-bs-theme='dark']) .ticket-details-panel,
      :host-context([data-bs-theme='dark']) .ticket-details-panel .card-body {
        background-color: var(--vz-card-bg, #212529) !important;
      }

      :host-context([data-bs-theme='dark']) .ticket-details-panel .card-header {
        background-color: var(--vz-card-cap-bg, #2a3042) !important;
      }

      .ticket-details-sidebar {
        position: static;
      }

      .ticket-detail-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        padding-bottom: 0.75rem;
        margin-bottom: 0.75rem;
        border-bottom: 1px solid var(--bs-border-color-translucent);
      }

      .ticket-detail-label {
        color: var(--bs-secondary-color);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .ticket-detail-value {
        text-align: right;
        word-break: break-word;
      }

      .ticket-rich-content {
        line-height: 1.5;
        word-break: break-word;
      }

      @media (max-width: 767.98px) {
        .ticket-header-actions {
          width: 100%;
        }
      }

      @media (min-width: 992px) {
        .ticket-details-sidebar {
          position: sticky;
          top: 1rem;
        }
      }
    `
  ]
})
export class SupportTicketDetailComponent implements OnInit {
  readonly SUPPORT_TICKET_TYPE_LABELS = SUPPORT_TICKET_TYPE_LABELS;
  readonly SUPPORT_TICKET_STATUS_LABELS = SUPPORT_TICKET_STATUS_LABELS;
  readonly SUPPORT_TICKET_PRIORITY_LABELS = SUPPORT_TICKET_PRIORITY_LABELS;
  readonly TICKET_IMPACT_LABELS = TICKET_IMPACT_LABELS;
  readonly TICKET_URGENCY_LABELS = TICKET_URGENCY_LABELS;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly supportTicketsService = inject(SupportTicketsService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(NgbModal);

  ticket = signal<SupportTicket | null>(null);
  comments = signal<SupportTicketComment[]>([]);
  attachments = signal<SupportTicketAttachment[]>([]);
  selectedUploadFiles = signal<File[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  isUploadingMedia = signal(false);
  uploadError = signal<string | null>(null);

  commentForm: FormGroup;
  detailsForm: FormGroup;

  statusOptions: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
  priorityOptions: SupportTicketPriority[] = ['low', 'medium', 'high', 'urgent'];
  typeOptions: SupportTicketType[] = [
    'bug',
    'feature_request',
    'question',
    'improvement',
    'maintenance',
    'access_permissions',
    'data_correction',
    'incident_outage',
  ];
  impactOptions: TicketImpactLevel[] = [TicketImpactLevel.HIGH, TicketImpactLevel.MEDIUM, TicketImpactLevel.LOW];
  urgencyOptions: TicketUrgencyLevel[] = [TicketUrgencyLevel.HIGH, TicketUrgencyLevel.MEDIUM, TicketUrgencyLevel.LOW];

  private ticketId = 0;

  breadcrumbItems = computed(() => [
    { label: 'Home', link: '/' },
    { label: 'My Tickets', link: '/support-tickets' },
    { label: this.ticket()?.ticket_number || 'Ticket', active: true }
  ]);

  mediaItems = computed<TicketMediaItem[]>(() => {
    const items: TicketMediaItem[] = [];
    const currentTicket = this.ticket();

    if (currentTicket?.screenshot_path) {
      const screenshotUrl = this.normalizeMediaUrl(currentTicket.screenshot_path);
      if (screenshotUrl) {
        items.push({
          id: `screenshot-${currentTicket.id}`,
          fileName: 'Original Screenshot',
          url: screenshotUrl,
          createdAt: currentTicket.created_at,
          source: 'screenshot',
        });
      }
    }

    for (const attachment of this.attachments()) {
      const attachmentUrl = this.normalizeMediaUrl(attachment.file_url);
      if (!attachmentUrl) {
        continue;
      }

      items.push({
        id: `attachment-${attachment.id}`,
        fileName: attachment.file_name,
        url: attachmentUrl,
        createdAt: attachment.created_at,
        source: 'attachment',
      });
    }

    return items;
  });

  constructor() {
    this.commentForm = this.formBuilder.group({
      comment: ['', [Validators.required, Validators.minLength(2)]],
    });
    this.detailsForm = this.formBuilder.group({
      type: ['bug', Validators.required],
      status: ['open', Validators.required],
      priority: ['medium', Validators.required],
      impactLevel: [TicketImpactLevel.LOW, Validators.required],
      urgencyLevel: [TicketUrgencyLevel.LOW, Validators.required],
    });
  }

  ngOnInit(): void {
    this.ticketId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.ticketId) {
      return;
    }

    this.loadTicket();
    this.loadComments();
    this.loadAttachments();
  }

  loadTicket(): void {
    this.isLoading.set(true);
    this.supportTicketsService.getTicket(this.ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.patchDetailsForm(ticket);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load ticket:', error);
          this.isLoading.set(false);
        },
      });
  }

  loadComments(): void {
    this.supportTicketsService.getComments(this.ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => this.comments.set(comments),
        error: (error) => console.error('Failed to load comments:', error),
      });
  }

  loadAttachments(): void {
    this.supportTicketsService.getAttachments(this.ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attachments) => this.attachments.set(attachments),
        error: (error) => {
          console.error('Failed to load attachments:', error);
          this.attachments.set([]);
        },
      });
  }

  submitComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const comment = this.commentForm.value.comment || '';

    this.supportTicketsService.addComment(this.ticketId, comment)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.commentForm.patchValue({ comment: '' });
          this.loadComments();
          this.loadTicket();
        },
        error: (error) => {
          console.error('Failed to add comment:', error);
          this.isSaving.set(false);
        },
      });
  }

  saveDetails(): void {
    if (this.detailsForm.invalid) {
      return;
    }

    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    const { type, status, priority, impactLevel, urgencyLevel } = this.detailsForm.value;

    this.isSaving.set(true);
    this.supportTicketsService.updateTicket(this.ticketId, {
      type,
      status,
      priority,
      metadata: {
        ...this.getTicketMetadata(ticket),
        impactLevel,
        urgencyLevel,
      },
    } as Partial<SupportTicket>)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTicket) => {
          this.ticket.set(updatedTicket);
          this.patchDetailsForm(updatedTicket);
          this.isSaving.set(false);
          this.notification.success('Ticket details updated.');
        },
        error: (error) => {
          console.error('Failed to update ticket details:', error);
          this.isSaving.set(false);
          this.notification.error(error, false);
        },
      });
  }

  onDetailsFieldChange(): void {
    if (this.detailsForm.invalid || this.isSaving()) {
      return;
    }

    this.saveDetails();
  }

  resetDetailsForm(): void {
    const ticket = this.ticket();
    if (!ticket) {
      return;
    }
    this.patchDetailsForm(ticket);
  }

  closeTicket(): void {
    this.isSaving.set(true);
    this.supportTicketsService.updateTicket(this.ticketId, { status: 'closed' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.patchDetailsForm(ticket);
          this.isSaving.set(false);
        },
        error: (error) => {
          console.error('Failed to close ticket:', error);
          this.isSaving.set(false);
        },
      });
  }

  deleteTicket(): void {
    if (!this.ticket()) {
      return;
    }

    const confirmed = window.confirm('Delete this ticket? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.supportTicketsService.deleteTicket(this.ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/support-tickets']);
        },
        error: (error) => {
          console.error('Failed to delete ticket:', error);
          this.isSaving.set(false);
        },
      });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'open': 'bg-primary',
      'in_progress': 'bg-warning',
      'resolved': 'bg-success',
      'closed': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  }

  getPriorityBadgeClass(priority: string): string {
    const classes: Record<string, string> = {
      'low': 'bg-info',
      'medium': 'bg-primary',
      'high': 'bg-warning',
      'urgent': 'bg-danger'
    };
    return classes[priority] || 'bg-secondary';
  }

  getTicketImpactLabel(ticket: SupportTicket): string {
    const impactRaw = this.getTicketMetadata(ticket)['impactLevel'];
    const impact = String(impactRaw ?? TicketImpactLevel.LOW) as TicketImpactLevel;
    return this.TICKET_IMPACT_LABELS[impact] || this.TICKET_IMPACT_LABELS[TicketImpactLevel.LOW];
  }

  getTicketUrgencyLabel(ticket: SupportTicket): string {
    const urgencyRaw = this.getTicketMetadata(ticket)['urgencyLevel'];
    const urgency = String(urgencyRaw ?? TicketUrgencyLevel.LOW) as TicketUrgencyLevel;
    return this.TICKET_URGENCY_LABELS[urgency] || this.TICKET_URGENCY_LABELS[TicketUrgencyLevel.LOW];
  }

  getRequestForDisplay(ticket: SupportTicket): string {
    const metadata = this.getTicketMetadata(ticket) as Record<string, unknown>;
    const requestFor = this.getMetadataString(metadata, ['requestFor', 'request_for']);
    return requestFor || ticket.user_email || '';
  }

  getOnBehalfOfDisplay(ticket: SupportTicket): boolean {
    const metadata = this.getTicketMetadata(ticket) as Record<string, unknown>;
    return this.getMetadataBoolean(metadata, ['onBehalfOfSomeoneElse', 'on_behalf_of_someone_else']);
  }

  getUpdateRecipientsDisplay(ticket: SupportTicket): string {
    const metadata = this.getTicketMetadata(ticket) as Record<string, unknown>;
    const recipients = this.getMetadataString(metadata, ['updateRecipients', 'update_recipients']);
    return recipients || ticket.user_email || '';
  }

  goBack(): void {
    this.router.navigate(['/support-tickets']);
  }

  openMedia(item: TicketMediaItem): void {
    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      scrollable: false,
    });

    modalRef.componentInstance.url = item.url;
    modalRef.componentInstance.fileName = item.fileName;
  }

  isImageUrl(url: string): boolean {
    const normalized = url.toLowerCase();
    return normalized.startsWith('data:image/')
      || normalized.includes('.png')
      || normalized.includes('.jpg')
      || normalized.includes('.jpeg')
      || normalized.includes('.gif')
      || normalized.includes('.webp');
  }

  onMediaFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';

    if (!files.length) {
      return;
    }

    void this.uploadMediaFiles(files);
  }

  async uploadSelectedMedia(): Promise<void> {
    return;
  }

  removePendingUpload(_index: number): void {
    return;
  }

  private async uploadMediaFiles(files: File[]): Promise<void> {
    if (files.length === 0 || !this.ticketId) {
      return;
    }

    this.isUploadingMedia.set(true);
    this.uploadError.set(null);

    try {
      for (const file of files) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        const createdAttachment = await firstValueFrom(
          this.supportTicketsService.uploadAttachment(this.ticketId, uploadFormData),
        );

        this.attachments.update((current) => [createdAttachment, ...current]);
      }

      this.loadAttachments();
    } catch (error) {
      console.error('Failed to upload media attachments:', error);
      this.uploadError.set('Upload failed. Please try again.');
    } finally {
      this.isUploadingMedia.set(false);
    }
  }

  private getTicketMetadata(ticket: SupportTicket): TicketMetadata {
    const metadata = ticket.metadata;
    if (metadata && typeof metadata === 'object') {
      return metadata as TicketMetadata;
    }

    return {};
  }

  private patchDetailsForm(ticket: SupportTicket): void {
    const metadata = this.getTicketMetadata(ticket);
    this.detailsForm.patchValue({
      type: ticket.type,
      status: ticket.status,
      priority: ticket.priority,
      impactLevel: (metadata.impactLevel as TicketImpactLevel) || TicketImpactLevel.LOW,
      urgencyLevel: (metadata.urgencyLevel as TicketUrgencyLevel) || TicketUrgencyLevel.LOW,
    });
  }

  private normalizeMediaUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return null;
    }

    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === '[inline-base64-image]') {
      return null;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    return `/${trimmed}`;
  }

  private getMetadataString(metadata: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private getMetadataBoolean(metadata: Record<string, unknown>, keys: string[]): boolean {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === 'yes' || normalized === '1') {
          return true;
        }
      }
      if (typeof value === 'number' && value === 1) {
        return true;
      }
    }
    return false;
  }
}
