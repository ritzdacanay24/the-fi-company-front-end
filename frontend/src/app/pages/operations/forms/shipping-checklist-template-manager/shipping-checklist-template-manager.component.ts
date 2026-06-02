import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  ShippingChecklistTemplate,
  ShippingChecklistsService,
} from '@app/core/api/operations/shipping-checklists/shipping-checklists.service';
import { NewUserService } from '@app/core/api/users/users.service';
import { SharedModule } from '@app/shared/shared.module';

interface InternalUserOption {
  id: number;
  label: string;
  email: string;
}

@Component({
  standalone: true,
  selector: 'app-shipping-checklist-template-manager',
  imports: [CommonModule, SharedModule, ReactiveFormsModule, RouterModule],
  templateUrl: './shipping-checklist-template-manager.component.html',
  styleUrls: ['./shipping-checklist-template-manager.component.scss'],
})
export class ShippingChecklistTemplateManagerComponent implements OnInit {
  templates: ShippingChecklistTemplate[] = [];
  selectedTemplate: ShippingChecklistTemplate | null = null;
  internalUsers: InternalUserOption[] = [];
  backupVerifierCandidateId: number | '' = '';

  isLoading = false;
  isSaving = false;

  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ShippingChecklistsService,
    private readonly usersService: NewUserService,
    private readonly toastr: ToastrService,
  ) {
    this.form = this.fb.group({
      customerCode: ['', Validators.required],
      customerName: ['', Validators.required],
      formTitle: ['', Validators.required],
      formCode: ['', Validators.required],
      logoText: [''],
      assignedVerifierUserId: [''],
      assignedBackupVerifierUserIds: [[]],
      assignedVerifierEmail: [''],
      assignedVerifierName: [''],
      questions: this.fb.array<FormGroup>([]),
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadInternalUsers(), this.loadTemplates()]);
  }

  get questionsArray(): FormArray<FormGroup> {
    return this.form.get('questions') as FormArray<FormGroup>;
  }

  get selectedVerifierLabel(): string {
    const userId = Number(this.form.get('assignedVerifierUserId')?.value || 0);
    const selected = this.internalUsers.find((item) => item.id === userId) || null;
    return selected ? `${selected.label} <${selected.email}>` : 'None assigned';
  }

  isPrimaryVerifierOption(userId: number): boolean {
    return Number(this.form.get('assignedVerifierUserId')?.value || 0) === Number(userId || 0);
  }

  get selectedBackupVerifierUserIds(): number[] {
    const values = this.form.get('assignedBackupVerifierUserIds')?.value;
    if (!Array.isArray(values)) {
      return [];
    }

    return values.map((value: unknown) => Number(value || 0)).filter((value: number) => value > 0);
  }

  get selectedBackupVerifiers(): InternalUserOption[] {
    const selectedIds = new Set<number>(this.selectedBackupVerifierUserIds);
    return this.internalUsers.filter((user) => selectedIds.has(user.id));
  }

  get availableBackupVerifierOptions(): InternalUserOption[] {
    const primaryId = Number(this.form.get('assignedVerifierUserId')?.value || 0);
    const selectedIds = new Set<number>(this.selectedBackupVerifierUserIds);

    return this.internalUsers.filter((user) => user.id !== primaryId && !selectedIds.has(user.id));
  }

  onAssignedVerifierChanged(): void {
    const primaryId = Number(this.form.get('assignedVerifierUserId')?.value || 0);
    const next = this.selectedBackupVerifierUserIds.filter((id) => id !== primaryId);
    this.form.patchValue({ assignedBackupVerifierUserIds: next });

    if (Number(this.backupVerifierCandidateId || 0) === primaryId) {
      this.backupVerifierCandidateId = '';
    }
  }

  addBackupVerifier(): void {
    const candidateId = Number(this.backupVerifierCandidateId || 0);
    if (candidateId <= 0) {
      return;
    }

    if (this.isPrimaryVerifierOption(candidateId)) {
      this.toastr.warning('Primary verifier cannot be added as backup.');
      this.backupVerifierCandidateId = '';
      return;
    }

    const next = Array.from(new Set<number>([...this.selectedBackupVerifierUserIds, candidateId]));
    this.form.patchValue({ assignedBackupVerifierUserIds: next });
    this.backupVerifierCandidateId = '';
  }

  removeBackupVerifier(userId: number): void {
    const next = this.selectedBackupVerifierUserIds.filter((id) => Number(id) !== Number(userId));
    this.form.patchValue({ assignedBackupVerifierUserIds: next });
  }

  async loadInternalUsers(): Promise<void> {
    try {
      const users = await this.usersService.getActiveUsers();
      this.internalUsers = (users || [])
        .map((user: any) => {
          const first = String(user.first || '').trim();
          const last = String(user.last || '').trim();
          const email = String(user.email || '').trim();
          const label = `${first} ${last}`.trim() || email || `User ${user.id}`;

          return {
            id: Number(user.id),
            label,
            email,
          };
        })
        .filter((user: InternalUserOption) => user.id > 0 && user.email.length > 0);

      if (this.selectedTemplate) {
        this.form.patchValue({
          assignedBackupVerifierUserIds: this.resolveBackupVerifierUserIds(this.selectedTemplate),
        });
      }
    } catch {
      this.internalUsers = [];
      this.toastr.error('Unable to load internal users');
    }
  }

  async loadTemplates(): Promise<void> {
    this.isLoading = true;
    try {
      this.templates = await this.service.getTemplates();
      if (this.templates.length > 0) {
        this.loadTemplate(this.templates[0].customerCode);
      }
    } catch (error) {
      this.toastr.error('Unable to load shipping checklist templates');
    } finally {
      this.isLoading = false;
    }
  }

  loadTemplate(customerCodeInput: string): void {
    const customerCode = String(customerCodeInput || '').trim().toLowerCase();
    const template = this.templates.find((item) => item.customerCode === customerCode) || null;
    if (!template) {
      return;
    }

    this.selectedTemplate = template;

    this.form.patchValue({
      customerCode: template.customerCode,
      customerName: template.customerName,
      formTitle: template.formTitle,
      formCode: template.formCode,
      logoText: template.logoText,
      assignedVerifierUserId: template.assignedVerifierUserId || '',
      assignedBackupVerifierUserIds: this.resolveBackupVerifierUserIds(template),
      assignedVerifierEmail: template.assignedVerifierEmail || '',
      assignedVerifierName: template.assignedVerifierName || '',
    });
    this.backupVerifierCandidateId = '';

    this.form.setControl(
      'questions',
      this.fb.array<FormGroup>(
        template.questions
          .sort((a, b) => a.questionOrder - b.questionOrder)
          .map((question) =>
            this.fb.group({
              questionOrder: [question.questionOrder, Validators.required],
              questionCode: [question.questionCode, Validators.required],
              questionText: [question.questionText, Validators.required],
              isRequired: [question.isRequired !== false],
            }),
          ),
      ),
    );
  }

  addQuestion(): void {
    this.questionsArray.push(
      this.fb.group({
        questionOrder: [this.questionsArray.length + 1, Validators.required],
        questionCode: [String(this.questionsArray.length + 1), Validators.required],
        questionText: ['', Validators.required],
        isRequired: [true],
      }),
    );
  }

  removeQuestion(index: number): void {
    this.questionsArray.removeAt(index);
    this.resequenceOrders();
  }

  moveQuestionUp(index: number): void {
    if (index <= 0) {
      return;
    }

    const current = this.questionsArray.at(index);
    const prev = this.questionsArray.at(index - 1);
    this.questionsArray.setControl(index - 1, current);
    this.questionsArray.setControl(index, prev);
    this.resequenceOrders();
  }

  moveQuestionDown(index: number): void {
    if (index >= this.questionsArray.length - 1) {
      return;
    }

    const current = this.questionsArray.at(index);
    const next = this.questionsArray.at(index + 1);
    this.questionsArray.setControl(index + 1, current);
    this.questionsArray.setControl(index, next);
    this.resequenceOrders();
  }

  resequenceOrders(): void {
    this.questionsArray.controls.forEach((control, index) => {
      control.patchValue({ questionOrder: index + 1 });
    });
  }

  async saveTemplate(): Promise<void> {
    if (this.form.invalid) {
      this.toastr.warning('Please complete required fields before saving');
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const customerCode = String(raw.customerCode || '').trim().toLowerCase();
    if (!customerCode) {
      this.toastr.warning('Customer code is required');
      return;
    }

    const selectedVerifierUserId = Number(raw.assignedVerifierUserId || 0);
    const selectedVerifier = this.internalUsers.find((user) => user.id === selectedVerifierUserId) || null;
    const selectedBackupVerifierUserIds = Array.isArray(raw.assignedBackupVerifierUserIds)
      ? raw.assignedBackupVerifierUserIds.map((value: unknown) => Number(value || 0)).filter((value: number) => value > 0)
      : [];
    const assignedVerifierEmail = this.buildBackupRecipientEmails(selectedBackupVerifierUserIds, selectedVerifierUserId);
    const assignedVerifierName = selectedVerifier?.label || String(raw.assignedVerifierName || '').trim();

    const questions = this.questionsArray.controls
      .map((control) => ({
        questionOrder: Number(control.get('questionOrder')?.value || 0),
        questionCode: String(control.get('questionCode')?.value || '').trim(),
        questionText: String(control.get('questionText')?.value || '').trim(),
        isRequired: Boolean(control.get('isRequired')?.value),
      }))
      .filter((question) => question.questionOrder > 0 && question.questionCode && question.questionText)
      .sort((a, b) => a.questionOrder - b.questionOrder);

    if (questions.length === 0) {
      this.toastr.warning('At least one question is required');
      return;
    }

    this.isSaving = true;
    try {
      const result = await this.service.upsertTemplate(customerCode, {
        customerName: String(raw.customerName || '').trim(),
        formTitle: String(raw.formTitle || '').trim(),
        formCode: String(raw.formCode || '').trim(),
        logoText: String(raw.logoText || '').trim(),
        assignedVerifierUserId: selectedVerifierUserId > 0 ? selectedVerifierUserId : null,
        assignedVerifierEmail: assignedVerifierEmail || null,
        assignedVerifierName: assignedVerifierName || null,
        questions,
      });

      if (!result.success) {
        this.toastr.error(result.error || 'Failed to save template');
        return;
      }

      this.toastr.success('Template saved');
      await this.loadTemplates();
      this.loadTemplate(customerCode);
    } catch (error) {
      this.toastr.error('Failed to save template');
    } finally {
      this.isSaving = false;
    }
  }

  private buildBackupRecipientEmails(userIds: number[], primaryUserId: number): string {
    const emails: string[] = [];
    const seen = new Set<string>();

    for (const userId of userIds) {
      if (userId <= 0 || userId === primaryUserId) {
        continue;
      }

      const user = this.internalUsers.find((item) => item.id === userId);
      if (!user || !user.email) {
        continue;
      }

      const email = String(user.email || '').trim();
      const lower = email.toLowerCase();
      if (!email || seen.has(lower)) {
        continue;
      }

      seen.add(lower);
      emails.push(email);
    }

    return emails.join(', ');
  }

  private resolveBackupVerifierUserIds(template: ShippingChecklistTemplate): number[] {
    const primaryId = Number(template.assignedVerifierUserId || 0);
    const recipientEmails = String(template.assignedVerifierEmail || '')
      .split(/[;,\n\r]+/g)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);

    if (recipientEmails.length === 0 || this.internalUsers.length === 0) {
      return [];
    }

    const recipientSet = new Set<string>(recipientEmails);
    const matchedUserIds: number[] = [];

    for (const user of this.internalUsers) {
      if (user.id === primaryId) {
        continue;
      }

      const email = String(user.email || '').trim().toLowerCase();
      if (email && recipientSet.has(email)) {
        matchedUserIds.push(Number(user.id));
      }
    }

    return matchedUserIds.filter((item) => item > 0);
  }
}
