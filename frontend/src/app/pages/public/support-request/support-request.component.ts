import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { SupportTicketsService } from '@app/core/api/support-tickets/support-tickets.service';
import {
  TicketImpactLevel,
  TicketPriority,
  TicketType,
  TicketUrgencyLevel,
  TICKET_IMPACT_LABELS,
  TICKET_URGENCY_LABELS,
} from '@app/shared/interfaces/ticket.interface';
import { AuthenticationService } from '@app/core/services/auth.service';

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
  private readonly itSupportUrl = 'https://averro.service-now.com/';

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

  readonly impactOptions: Array<{ value: TicketImpactLevel; label: string }> =
    Object.entries(TICKET_IMPACT_LABELS).map(([value, label]) => ({
      value: value as TicketImpactLevel,
      label,
    }));

  readonly urgencyOptions: Array<{ value: TicketUrgencyLevel; label: string }> =
    Object.entries(TICKET_URGENCY_LABELS).map(([value, label]) => ({
      value: value as TicketUrgencyLevel,
      label,
    }));

  readonly form = this.fb.group({
    submitter_name: ['', [Validators.required, Validators.minLength(2)]],
    submitter_email: ['', [Validators.required, Validators.email]],
    support_category: ['', [Validators.required]],
    type: [this.initialType, [Validators.required]],
    onBehalfOfSomeoneElse: [false],
    requestFor: ['', [Validators.required]],
    impactLevel: [TicketImpactLevel.LOW, [Validators.required]],
    urgencyLevel: [TicketUrgencyLevel.LOW, [Validators.required]],
    updateRecipients: [''],
    steps: [''],
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
  });

  isSubmitting = false;
  submitted = false;
  successTicketNumber = '';
  selectedSupportCategory: SupportCategory | null = null;
  isAuthenticated = false;
  authenticatedDisplayName = '';
  authenticatedEmail = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly supportTicketsService: SupportTicketsService,
    private readonly authenticationService: AuthenticationService,
    private readonly router: Router,
    public readonly route: ActivatedRoute,
  ) {
    this.applyAuthContext();
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
      const basePayload = {
        type: rawPayload.type,
        priority: this.derivePriority(rawPayload.impactLevel, rawPayload.urgencyLevel),
        title: rawPayload.title,
        description: rawPayload.description,
        steps: rawPayload.steps,
        metadata: {
          support_category: this.selectedSupportCategory || rawPayload.support_category,
          source: String(this.route.snapshot.queryParamMap.get('source') || '').toLowerCase() || null,
          intake_mode: this.isAuthenticated ? 'authenticated' : 'public',
          requestFor: String(rawPayload.requestFor || rawPayload.submitter_email || this.authenticatedEmail || '').trim(),
          onBehalfOfSomeoneElse: Boolean(rawPayload.onBehalfOfSomeoneElse),
          impactLevel: rawPayload.impactLevel || TicketImpactLevel.LOW,
          urgencyLevel: rawPayload.urgencyLevel || TicketUrgencyLevel.LOW,
          updateRecipients: String(rawPayload.updateRecipients || '').trim(),
        },
      };

      const ticket = this.isAuthenticated
        ? await this.supportTicketsService.createTicket(basePayload).toPromise()
        : await this.supportTicketsService.createPublicTicket({
            ...basePayload,
            submitter_name: rawPayload.submitter_name,
            submitter_email: rawPayload.submitter_email,
          }).toPromise();

      this.successTicketNumber = ticket?.ticket_number || '';
      this.form.disable();
    } finally {
      this.isSubmitting = false;
    }
  }

  goToLogin(): void {
    void this.router.navigate([this.isAuthenticated ? '/menu' : '/auth/login']);
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
      onBehalfOfSomeoneElse: false,
      requestFor: '',
      impactLevel: TicketImpactLevel.LOW,
      urgencyLevel: TicketUrgencyLevel.LOW,
      updateRecipients: '',
      steps: '',
      title: '',
      description: '',
    });

    this.selectedSupportCategory = null;

    this.applyAuthContext();
    this.applyPrefillFromQueryParams();
  }

  selectSupportCategory(category: SupportCategory): void {
    if (category === 'it_access') {
      this.openItSupportInNewTab();
      return;
    }

    this.selectedSupportCategory = 'dashboard_app';
    this.form.patchValue({ support_category: 'dashboard_app' });
  }

  backToCategorySelection(): void {
    this.selectedSupportCategory = null;
    this.submitted = false;
    this.form.patchValue({ support_category: '' });
  }

  private applyAuthContext(): void {
    const currentUser = this.authenticationService.currentUserValue;
    this.isAuthenticated = !!currentUser?.token;

    const submitterNameControl = this.form.get('submitter_name');
    const submitterEmailControl = this.form.get('submitter_email');
    const requestForControl = this.form.get('requestFor');

    if (!submitterNameControl || !submitterEmailControl || !requestForControl) {
      return;
    }

    if (this.isAuthenticated) {
      const first = String(currentUser?.first || '').trim();
      const last = String(currentUser?.last || '').trim();
      this.authenticatedDisplayName = [first, last].filter(Boolean).join(' ').trim();
      this.authenticatedEmail = String(currentUser?.email || currentUser?.user_email || '').trim();

      submitterNameControl.setValidators([]);
      submitterEmailControl.setValidators([]);

      submitterNameControl.patchValue(this.authenticatedDisplayName || '', { emitEvent: false });
      submitterEmailControl.patchValue(this.authenticatedEmail || '', { emitEvent: false });
      if (!String(requestForControl.value || '').trim()) {
        requestForControl.patchValue(this.authenticatedEmail || this.authenticatedDisplayName || '', { emitEvent: false });
      }
    } else {
      this.authenticatedDisplayName = '';
      this.authenticatedEmail = '';

      submitterNameControl.setValidators([Validators.required, Validators.minLength(2)]);
      submitterEmailControl.setValidators([Validators.required, Validators.email]);
    }

    submitterNameControl.updateValueAndValidity({ emitEvent: false });
    submitterEmailControl.updateValueAndValidity({ emitEvent: false });

    if (!this.isAuthenticated && !String(requestForControl.value || '').trim()) {
      const existingEmail = String(submitterEmailControl.value || '').trim();
      if (existingEmail) {
        requestForControl.patchValue(existingEmail, { emitEvent: false });
      }
    }

    requestForControl.updateValueAndValidity({ emitEvent: false });
  }

  private derivePriority(
    impact: TicketImpactLevel | null | undefined,
    urgency: TicketUrgencyLevel | null | undefined,
  ): TicketPriority {
    if (impact === TicketImpactLevel.HIGH || urgency === TicketUrgencyLevel.HIGH) {
      return TicketPriority.URGENT;
    }

    if (impact === TicketImpactLevel.MEDIUM || urgency === TicketUrgencyLevel.MEDIUM) {
      return TicketPriority.HIGH;
    }

    return TicketPriority.MEDIUM;
  }

  private applyPrefillFromQueryParams(): void {
    const source = String(this.route.snapshot.queryParamMap.get('source') || '').toLowerCase();
    const category = String(this.route.snapshot.queryParamMap.get('category') || '').toLowerCase();
    const type = String(this.route.snapshot.queryParamMap.get('type') || '').toLowerCase();
    const priority = String(this.route.snapshot.queryParamMap.get('priority') || '').toLowerCase();
    const title = String(this.route.snapshot.queryParamMap.get('title') || '').trim();

    if (category === 'dashboard_app') {
      this.selectedSupportCategory = 'dashboard_app';
      this.form.patchValue({ support_category: 'dashboard_app' });
    }

    if (category === 'it_access') {
      this.openItSupportInNewTab();
      this.selectedSupportCategory = null;
      this.form.patchValue({ support_category: '' });
    }

    if (this.isTicketType(type)) {
      this.form.patchValue({ type });
    }

    if (this.isTicketPriority(priority)) {
      this.form.patchValue(this.mapPriorityToImpactUrgency(priority));
    }

    if (title) {
      this.form.patchValue({ title });
    }

    if (source === 'login' || source === 'dashboard') {
      this.form.patchValue({
        type: TicketType.INCIDENT_OUTAGE,
        ...this.mapPriorityToImpactUrgency(TicketPriority.HIGH),
      });
    }
  }

  private isTicketType(value: string): value is TicketType {
    return (Object.values(TicketType) as string[]).includes(value);
  }

  private isTicketPriority(value: string): value is TicketPriority {
    return (Object.values(TicketPriority) as string[]).includes(value);
  }

  private mapPriorityToImpactUrgency(priority: TicketPriority): {
    impactLevel: TicketImpactLevel;
    urgencyLevel: TicketUrgencyLevel;
  } {
    if (priority === TicketPriority.URGENT) {
      return {
        impactLevel: TicketImpactLevel.HIGH,
        urgencyLevel: TicketUrgencyLevel.HIGH,
      };
    }

    if (priority === TicketPriority.HIGH) {
      return {
        impactLevel: TicketImpactLevel.MEDIUM,
        urgencyLevel: TicketUrgencyLevel.HIGH,
      };
    }

    if (priority === TicketPriority.LOW) {
      return {
        impactLevel: TicketImpactLevel.LOW,
        urgencyLevel: TicketUrgencyLevel.LOW,
      };
    }

    return {
      impactLevel: TicketImpactLevel.MEDIUM,
      urgencyLevel: TicketUrgencyLevel.MEDIUM,
    };
  }

  private openItSupportInNewTab(): void {
    window.open(this.itSupportUrl, '_blank', 'noopener,noreferrer');
  }
}
