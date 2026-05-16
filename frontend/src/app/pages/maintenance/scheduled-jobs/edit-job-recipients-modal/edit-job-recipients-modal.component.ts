import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  ScheduledJobNotificationScope,
  ScheduledJobRecipient,
  ScheduledJobRow,
  ScheduledJobRecipientType,
  UpsertScheduledJobRecipient,
} from '@app/core/api/scheduled-jobs/scheduled-jobs.service';
import { NewUserService } from '@app/core/api/users/users.service';

interface UserOption {
  id: number;
  label: string;
  email: string;
}

@Component({
  selector: 'app-edit-job-recipients-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-job-recipients-modal.component.html',
  styleUrls: ['./edit-job-recipients-modal.component.scss'],
})
export class EditJobRecipientsModalComponent implements OnInit {
  @Input() job?: ScheduledJobRow;

  private _recipients: ScheduledJobRecipient[] = [];

  @Input()
  set recipients(value: ScheduledJobRecipient[] | null | undefined) {
    this._recipients = Array.isArray(value) ? value : [];
    this.patchRecipients(this._recipients);
  }

  get recipients(): ScheduledJobRecipient[] {
    return this._recipients;
  }

  readonly isSubmitting = signal(false);
  readonly isLoadingUsers = signal(false);
  readonly users = signal<UserOption[]>([]);
  private activeUserIds = new Set<number>();

  readonly recipientCount = computed(() => this.recipientsFormArray.length);

  readonly form = this.fb.group({
    recipients: this.fb.array<FormGroup>([]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly usersApi: NewUserService,
    public readonly activeModal: NgbActiveModal,
  ) {}

  async ngOnInit(): Promise<void> {
    this.patchRecipients(this._recipients);
    await this.loadUsers();
  }

  get recipientsFormArray(): FormArray<FormGroup> {
    return this.form.get('recipients') as FormArray<FormGroup>;
  }

  trackByIndex(index: number): number {
    return index;
  }

  isInactiveOrMissingInternalUser(index: number): boolean {
    if (this.isLoadingUsers()) {
      return false;
    }

    const group = this.recipientsFormArray.at(index);
    const raw = group?.getRawValue?.();
    const recipientType = raw?.recipientType;
    const userId = Number(raw?.userId);

    if (recipientType !== 'internal_user') {
      return false;
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return false;
    }

    return !this.activeUserIds.has(userId);
  }

  addRecipient(): void {
    this.recipientsFormArray.push(this.createRecipientFormGroup());
  }

  removeRecipient(index: number): void {
    this.recipientsFormArray.removeAt(index);
  }

  onRecipientTypeChange(index: number): void {
    const group = this.recipientsFormArray.at(index);
    const recipientType = group.get('recipientType')?.value as ScheduledJobRecipientType;

    if (recipientType === 'internal_user') {
      group.get('email')?.setValue('');
      group.get('email')?.disable({ emitEvent: false });
      group.get('userId')?.enable({ emitEvent: false });
      group.get('displayName')?.disable({ emitEvent: false });
    } else {
      group.get('userId')?.setValue(null);
      group.get('userId')?.disable({ emitEvent: false });
      group.get('email')?.enable({ emitEvent: false });
      group.get('displayName')?.enable({ emitEvent: false });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.recipientsFormArray.controls.forEach((control) => control.markAllAsTouched());
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = this.toPayload();
      this.activeModal.close(payload);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.activeModal.dismiss({ dismissed: true });
  }

  getUserLabel(userId: number | null): string {
    if (!userId) {
      return '';
    }

    const option = this.users().find((row) => row.id === userId);
    return option?.label ?? '';
  }

  private patchRecipients(recipients: ScheduledJobRecipient[]): void {
    this.recipientsFormArray.clear();

    if (!recipients.length) {
      this.recipientsFormArray.push(this.createRecipientFormGroup());
      return;
    }

    for (const recipient of recipients) {
      this.recipientsFormArray.push(
        this.createRecipientFormGroup({
          recipientType: recipient.recipientType,
          userId: recipient.userId,
          email: recipient.email ?? recipient.resolvedEmail ?? '',
          displayName: recipient.displayName ?? recipient.resolvedName ?? '',
          isSubscribed: recipient.isSubscribed,
          isAssignee: recipient.isAssignee,
          notificationScope: recipient.notificationScope,
          active: recipient.active,
        }),
      );
    }

    this.ensureSelectedInternalUsersVisible();
  }

  private createRecipientFormGroup(values?: {
    recipientType?: ScheduledJobRecipientType;
    userId?: number | null;
    email?: string;
    displayName?: string;
    isSubscribed?: boolean;
    isAssignee?: boolean;
    notificationScope?: ScheduledJobNotificationScope;
    active?: boolean;
  }): FormGroup {
    const recipientType = values?.recipientType ?? 'external_email';

    const group = this.fb.group({
      recipientType: [recipientType, Validators.required],
      userId: [values?.userId ?? null],
      email: [values?.email ?? '', [Validators.email]],
      displayName: [values?.displayName ?? ''],
      isSubscribed: [values?.isSubscribed ?? true],
      isAssignee: [values?.isAssignee ?? false],
      notificationScope: [values?.notificationScope ?? 'always'],
      active: [values?.active ?? true],
    });

    if (recipientType === 'internal_user') {
      group.get('email')?.disable({ emitEvent: false });
      group.get('displayName')?.disable({ emitEvent: false });
    } else {
      group.get('userId')?.disable({ emitEvent: false });
    }

    return group;
  }

  private async loadUsers(): Promise<void> {
    this.isLoadingUsers.set(true);

    try {
      const users = await this.usersApi.getActiveUsers();
      const options = (users || [])
        .filter((user) => Number(user?.id) > 0 && String(user?.email || '').trim().length > 0)
        .map((user) => ({
          id: Number(user.id),
          label: `${String(user.first || '').trim()} ${String(user.last || '').trim()} (${String(user.email || '').trim()})`.trim(),
          email: String(user.email || '').trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      this.activeUserIds = new Set(options.map((row) => row.id));
      this.users.set(options);
      this.ensureSelectedInternalUsersVisible();
    } catch {
      this.activeUserIds = new Set<number>();
      this.users.set([]);
      this.ensureSelectedInternalUsersVisible();
    } finally {
      this.isLoadingUsers.set(false);
    }
  }

  private ensureSelectedInternalUsersVisible(): void {
    const merged = [...this.users()];
    const existingIds = new Set(merged.map((row) => row.id));

    for (const row of this.recipientsFormArray.controls) {
      const raw = row.getRawValue();
      if (raw.recipientType !== 'internal_user') {
        continue;
      }

      const userId = Number(raw.userId);
      if (!Number.isInteger(userId) || userId <= 0 || existingIds.has(userId)) {
        continue;
      }

      merged.push({
        id: userId,
        label: `User #${userId} (inactive or missing)`,
        email: '',
      });
      existingIds.add(userId);
    }

    merged.sort((a, b) => a.label.localeCompare(b.label));
    this.users.set(merged);
  }

  private toPayload(): UpsertScheduledJobRecipient[] {
    const payload: UpsertScheduledJobRecipient[] = [];

    for (const row of this.recipientsFormArray.controls) {
      const raw = row.getRawValue();
      const recipientType = raw.recipientType as ScheduledJobRecipientType;

      if (recipientType === 'internal_user') {
        const userId = Number(raw.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
          continue;
        }

        payload.push({
          recipientType: 'internal_user',
          userId,
          isSubscribed: !!raw.isSubscribed,
          isAssignee: !!raw.isAssignee,
          notificationScope: raw.notificationScope as ScheduledJobNotificationScope,
          active: !!raw.active,
        });
        continue;
      }

      const email = String(raw.email || '').trim().toLowerCase();
      if (!email) {
        continue;
      }

      payload.push({
        recipientType: 'external_email',
        email,
        displayName: String(raw.displayName || '').trim() || undefined,
        isSubscribed: !!raw.isSubscribed,
        isAssignee: !!raw.isAssignee,
        notificationScope: raw.notificationScope as ScheduledJobNotificationScope,
        active: !!raw.active,
      });
    }

    return payload;
  }
}
