import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { SupportTicketsService } from '@app/core/api/support-tickets/support-tickets.service';
import { TicketPriority, TicketType } from '@app/shared/interfaces/ticket.interface';

type SupportCategory = 'dashboard_app' | 'it_access';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedModule],
  selector: 'app-support-request',
  templateUrl: './support-request.component.html',
  styleUrls: ['./support-request.component.scss'],
})
export class SupportRequestComponent {
  private readonly initialType = TicketType.INCIDENT_OUTAGE;
  private readonly initialPriority = TicketPriority.MEDIUM;

  readonly supportCategories: Array<{ value: SupportCategory; label: string; description: string }> = [
    { value: 'dashboard_app', label: 'Dashboard / App Issue', description: 'Problems with dashboard pages, workflows, data, or app behavior.' },
    { value: 'it_access', label: 'IT / Access Issue', description: 'Account access, permissions, device, network, or environment issues.' },
  ];

  readonly ticketTypes: Array<{ value: TicketType; label: string; description: string }> = [
    { value: TicketType.INCIDENT_OUTAGE, label: 'Incident / Outage', description: 'Something is down or not working' },
    { value: TicketType.BUG, label: 'Bug', description: 'Unexpected system behavior or error' },
    { value: TicketType.QUESTION, label: 'Question', description: 'Need help understanding a feature' },
    { value: TicketType.IMPROVEMENT, label: 'Improvement', description: 'Suggestion to make the system better' },
    { value: TicketType.FEATURE_REQUEST, label: 'Feature Request', description: 'Request a new capability' },
  ];

  readonly priorityOptions: Array<{ value: TicketPriority; label: string }> = [
    { value: TicketPriority.LOW, label: 'Low' },
    { value: TicketPriority.MEDIUM, label: 'Medium' },
    { value: TicketPriority.HIGH, label: 'High' },
    { value: TicketPriority.URGENT, label: 'Urgent' },
  ];

  readonly form = this.fb.group({
    submitter_name: ['', [Validators.required, Validators.minLength(2)]],
    submitter_email: ['', [Validators.required, Validators.email]],
    support_category: ['', [Validators.required]],
    type: [this.initialType, [Validators.required]],
    priority: [this.initialPriority, [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
  });

  isSubmitting = false;
  submitted = false;
  successTicketNumber = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly supportTicketsService: SupportTicketsService,
    private readonly router: Router,
    public readonly route: ActivatedRoute,
  ) {
    this.applyPrefillFromQueryParams();
  }

  get controls() {
    return this.form.controls;
  }

  async submit(): Promise<void> {
    this.submitted = true;
    this.successTicketNumber = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      const rawPayload = this.form.getRawValue();
      const payload = {
        submitter_name: rawPayload.submitter_name,
        submitter_email: rawPayload.submitter_email,
        type: rawPayload.type,
        priority: rawPayload.priority,
        title: rawPayload.title,
        description: rawPayload.description,
        metadata: {
          support_category: rawPayload.support_category,
          source: String(this.route.snapshot.queryParamMap.get('source') || '').toLowerCase() || null,
        },
      };
      const ticket = await this.supportTicketsService.createPublicTicket(payload).toPromise();
      this.successTicketNumber = ticket?.ticket_number || '';
      this.form.disable();
    } finally {
      this.isSubmitting = false;
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }

  createAnotherTicket(): void {
    this.successTicketNumber = '';
    this.submitted = false;
    this.isSubmitting = false;

    this.form.enable();
    this.form.reset({
      submitter_name: '',
      submitter_email: '',
      support_category: '',
      type: this.initialType,
      priority: this.initialPriority,
      title: '',
      description: '',
    });

    this.applyPrefillFromQueryParams();
  }

  private applyPrefillFromQueryParams(): void {
    const source = String(this.route.snapshot.queryParamMap.get('source') || '').toLowerCase();
    const category = String(this.route.snapshot.queryParamMap.get('category') || '').toLowerCase();
    const type = String(this.route.snapshot.queryParamMap.get('type') || '').toLowerCase();
    const priority = String(this.route.snapshot.queryParamMap.get('priority') || '').toLowerCase();
    const title = String(this.route.snapshot.queryParamMap.get('title') || '').trim();

    if (category === 'dashboard_app' || category === 'it_access') {
      this.form.patchValue({ support_category: category });
    }

    if (this.isTicketType(type)) {
      this.form.patchValue({ type });
    }

    if (this.isTicketPriority(priority)) {
      this.form.patchValue({ priority });
    }

    if (title) {
      this.form.patchValue({ title });
    }

    if (source === 'login' || source === 'dashboard') {
      this.form.patchValue({ type: TicketType.INCIDENT_OUTAGE, priority: TicketPriority.HIGH });
    }
  }

  private isTicketType(value: string): value is TicketType {
    return (Object.values(TicketType) as string[]).includes(value);
  }

  private isTicketPriority(value: string): value is TicketPriority {
    return (Object.values(TicketPriority) as string[]).includes(value);
  }
}
