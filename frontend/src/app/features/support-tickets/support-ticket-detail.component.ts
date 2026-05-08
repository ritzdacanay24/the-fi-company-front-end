import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { SupportTicketsService } from '@app/core/api/support-tickets/support-tickets.service';
import { BreadcrumbComponent } from '@app/shared/components/breadcrumb/breadcrumb.component';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_TYPE_LABELS,
  SupportTicket,
  SupportTicketComment,
  SupportTicketStatus,
  SupportTicketPriority,
} from '@app/shared/models/support-ticket.model';
import moment from 'moment';

@Component({
  selector: 'app-support-ticket-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BreadcrumbComponent],
  templateUrl: './support-ticket-detail.component.html'
})
export class SupportTicketDetailComponent implements OnInit {
  readonly SUPPORT_TICKET_TYPE_LABELS = SUPPORT_TICKET_TYPE_LABELS;
  readonly SUPPORT_TICKET_STATUS_LABELS = SUPPORT_TICKET_STATUS_LABELS;
  readonly SUPPORT_TICKET_PRIORITY_LABELS = SUPPORT_TICKET_PRIORITY_LABELS;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly supportTicketsService = inject(SupportTicketsService);
  private readonly destroyRef = inject(DestroyRef);

  ticket = signal<SupportTicket | null>(null);
  comments = signal<SupportTicketComment[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  isEditingStatus = signal(false);
  isEditingPriority = signal(false);

  commentForm: FormGroup;
  statusForm: FormGroup;
  priorityForm: FormGroup;

  statusOptions: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
  priorityOptions: SupportTicketPriority[] = ['low', 'medium', 'high', 'urgent'];

  private ticketId = 0;

  breadcrumbItems = computed(() => [
    { label: 'Home', link: '/' },
    { label: 'Support Tickets', link: '/support-tickets' },
    { label: this.ticket()?.ticket_number || 'Ticket', active: true }
  ]);

  constructor() {
    this.commentForm = this.formBuilder.group({
      comment: ['', [Validators.required, Validators.minLength(2)]],
    });
    this.statusForm = this.formBuilder.group({
      status: ['', Validators.required],
    });
    this.priorityForm = this.formBuilder.group({
      priority: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.ticketId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.ticketId) {
      return;
    }

    this.loadTicket();
    this.loadComments();
  }

  loadTicket(): void {
    this.isLoading.set(true);
    this.supportTicketsService.getTicket(this.ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.statusForm.patchValue({ status: ticket.status });
          this.priorityForm.patchValue({ priority: ticket.priority });
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

  updateStatus(): void {
    if (this.statusForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    const newStatus = this.statusForm.value.status;

    this.supportTicketsService.updateTicket(this.ticketId, { status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.isEditingStatus.set(false);
          this.isSaving.set(false);
        },
        error: (error) => {
          console.error('Failed to update status:', error);
          this.isSaving.set(false);
        },
      });
  }

  updatePriority(): void {
    if (this.priorityForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    const newPriority = this.priorityForm.value.priority;

    this.supportTicketsService.updateTicket(this.ticketId, { priority: newPriority })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.isEditingPriority.set(false);
          this.isSaving.set(false);
        },
        error: (error) => {
          console.error('Failed to update priority:', error);
          this.isSaving.set(false);
        },
      });
  }

  closeTicket(): void {
    this.isSaving.set(true);
    this.supportTicketsService.updateTicket(this.ticketId, { status: 'closed' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.isSaving.set(false);
        },
        error: (error) => {
          console.error('Failed to close ticket:', error);
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

  goBack(): void {
    this.router.navigate(['/support-tickets']);
  }
}
