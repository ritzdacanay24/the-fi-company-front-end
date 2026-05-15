import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '@app/core/services/notification.service';
import {
  TicketImpactLevel,
  TicketPriority,
  TicketType,
  TicketUrgencyLevel,
  TICKET_IMPACT_LABELS,
  TICKET_TYPE_LABELS,
  TICKET_URGENCY_LABELS,
} from '@app/shared/interfaces/ticket.interface';
import { QuillModule } from 'ngx-quill';
import { SupportTicketDraft, SupportTicketDraftService } from '@app/core/services/support-ticket-draft.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { InlineAttachmentDropzoneComponent } from '@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component';

/**
 * Submit Ticket Dialog
 *
 * Unified dialog for submitting support tickets:
 * - 🐛 Bug reports
 * - ✨ Feature requests
 * - ❓ Questions
 * - 💡 Improvements
 * - and more
 *
 * Can be triggered manually or automatically from errors.
 */
@Component({
  selector: 'app-error-report-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuillModule, InlineAttachmentDropzoneComponent],
  styles: [`
    .modal-header { display: flex; align-items: center; }
    .modal-title { margin-bottom: 0; }
    .quill-editor-container { width: 100%; }
    .quill-editor-container .ql-editor { min-height: 150px; }
    .quill-editor-steps {
      width: 100%;
      --steps-editor-height: 180px;
    }
    :host ::ng-deep .quill-editor-steps .ql-container {
      height: var(--steps-editor-height);
      min-height: var(--steps-editor-height);
    }
    :host ::ng-deep .quill-editor-steps .ql-editor {
      height: 100%;
      min-height: 100%;
      overflow-y: auto;
    }
    .quill-editor-container.is-invalid .ql-toolbar,
    .quill-editor-container.is-invalid .ql-container { border-color: var(--bs-danger) !important; }
    .header-actions .btn.btn-icon {
      width: 32px; height: 32px; padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .attachment-thumb { width: 32px; height: 32px; object-fit: cover; }
  `],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">
        <i class="mdi mdi-ticket me-2"></i>
        Submit Ticket
      </h5>
      <div class="header-actions ms-auto d-flex align-items-center gap-1">
        <button
          type="button"
          class="btn btn-ghost-secondary btn-icon btn-sm material-shadow-none rounded-circle"
          title="Minimize"
          aria-label="Minimize"
          (click)="minimize()"
          [disabled]="isSubmitting()">
          <i class="mdi mdi-window-minimize"></i>
        </button>
        <button type="button" class="btn-close" (click)="cancel()"></button>
      </div>
    </div>

    <div class="modal-body" (paste)="onPaste($event)">
      <form [formGroup]="form">
        <div class="row">
          <div class="col-md-12 mb-3">
            <label for="type" class="form-label">
              Ticket Type <span class="text-danger">*</span>
            </label>
            <select id="type" class="form-select" formControlName="type">
              @for (typeOption of ticketTypes; track typeOption.value) {
                <option [value]="typeOption.value">{{ typeOption.label }}</option>
              }
            </select>
          </div>
        </div>

        <div class="alert alert-info py-2 px-3 mb-3" role="note">
          <div class="fw-semibold mb-1">
            <i class="mdi mdi-information-outline me-1"></i>
            Ticket Submission Tip
          </div>
          <div class="small mb-1">Submit one request or outcome per ticket.</div>
          <div class="small mb-1">If one part can be closed while another stays open, create separate tickets.</div>
          <div class="small">Keep items together only when they must ship together and share acceptance criteria.</div>
        </div>

        <div class="row">
          <div class="col-12 mb-3">
            <div class="form-check">
              <input
                id="onBehalfOfSomeoneElse"
                type="checkbox"
                class="form-check-input"
                formControlName="onBehalfOfSomeoneElse">
              <label for="onBehalfOfSomeoneElse" class="form-check-label">
                I'm creating this on behalf of someone else.
              </label>
            </div>
          </div>

          <div class="col-12 mb-3">
            <label for="requestFor" class="form-label">
              Who Is This Request For? <span class="text-danger">*</span>
            </label>
            <input
              id="requestFor"
              type="text"
              class="form-control"
              formControlName="requestFor"
              placeholder="Name or email of the affected person"
              [class.is-invalid]="form.get('requestFor')?.invalid && form.get('requestFor')?.touched">
            @if (form.get('requestFor')?.hasError('required') && form.get('requestFor')?.touched) {
              <div class="invalid-feedback d-block">Request for is required</div>
            }
          </div>

          <div class="col-12 mb-3">
            <label for="title" class="form-label">
              Short Description <span class="text-danger">*</span>
            </label>
            <input
              id="title"
              type="text"
              class="form-control"
              formControlName="title"
              placeholder="Brief summary of the issue..."
              [class.is-invalid]="form.get('title')?.invalid && form.get('title')?.touched">
            @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
              <div class="invalid-feedback d-block">Title is required</div>
            }
            @if (form.get('title')?.hasError('minlength') && form.get('title')?.touched) {
              <div class="invalid-feedback d-block">Title must be at least 5 characters</div>
            }
          </div>
        </div>

        <div class="row">
          <div class="col-12 mb-3">
            <label for="description" class="form-label">
              Issue Description <span class="text-danger">*</span>
            </label>
            <div class="quill-editor-container"
                 [class.is-invalid]="form.get('description')?.invalid && form.get('description')?.touched">
              <quill-editor
                style="width:100%"
                formControlName="description"
                [modules]="quillModules"
                (onEditorCreated)="onTicketEditorCreated($event)"
                [placeholder]="getDescriptionPlaceholder()">
              </quill-editor>
            </div>
            @if (form.get('description')?.hasError('required') && form.get('description')?.touched) {
              <div class="invalid-feedback d-block">Description is required</div>
            }
            @if (form.get('description')?.hasError('minlength') && form.get('description')?.touched) {
              <div class="invalid-feedback d-block">Description must be at least 10 characters</div>
            }
          </div>
        </div>

        <div class="row">
          <div class="col-12 mb-3">
            <label class="form-label d-block">
              Impact <span class="text-danger">*</span>
            </label>
            @for (impactOption of impactLevels; track impactOption.value) {
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="radio"
                  [id]="'impact-' + impactOption.value"
                  formControlName="impactLevel"
                  [value]="impactOption.value">
                <label class="form-check-label" [for]="'impact-' + impactOption.value">
                  {{ impactOption.label }}
                </label>
              </div>
            }
          </div>

          <div class="col-12 mb-3">
            <label class="form-label d-block">
              Urgency <span class="text-danger">*</span>
            </label>
            @for (urgencyOption of urgencyLevels; track urgencyOption.value) {
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="radio"
                  [id]="'urgency-' + urgencyOption.value"
                  formControlName="urgencyLevel"
                  [value]="urgencyOption.value">
                <label class="form-check-label" [for]="'urgency-' + urgencyOption.value">
                  {{ urgencyOption.label }}
                </label>
              </div>
            }
          </div>

          <div class="col-12 mb-3">
            <label for="updateRecipients" class="form-label">Who Should Get Updates?</label>
            <input
              id="updateRecipients"
              type="text"
              class="form-control"
              formControlName="updateRecipients"
              placeholder="Additional email recipients, comma-separated">
            <small class="text-muted">Does anyone else need to receive emailed updates on the ticket?</small>
          </div>

          <div class="col-12 mb-3">
            <label for="steps" class="form-label">Steps to Reproduce (Optional)</label>
            <div class="quill-editor-container quill-editor-steps">
              <quill-editor
                style="width:100%"
                formControlName="steps"
                [modules]="quillModules"
                (onEditorCreated)="onTicketEditorCreated($event)"
                [placeholder]="stepsPlaceholder">
              </quill-editor>
            </div>
            <small class="text-muted d-block mt-2">Provide step-by-step instructions to reproduce the issue</small>
          </div>
        </div>

        <div class="row">
          <div class="col-12 mb-3">
            <label class="form-label">
              <i class="mdi mdi-image-multiple me-1"></i>
              Attachments (Optional)
            </label>

            <app-inline-attachment-dropzone
              [accept]="'image/*'"
              [multiple]="true"
              [disabled]="isSubmitting()"
              [allowPaste]="true"
              [openPickerOnContainerClick]="false"
              [chooseLabel]="'Choose image files'"
              [dropLabel]="'or drag images here.'"
              [pasteHint]="'Or press Ctrl+V to paste a screenshot anywhere in this dialog'"
              [showPasteHint]="true"
              (filesAdded)="onAttachmentFilesAdded($event)">
            </app-inline-attachment-dropzone>

            @if (selectedFiles().length > 0) {
              <div class="mt-2">
                @for (file of selectedFiles(); track $index) {
                  <div class="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
                    <button
                      type="button"
                      class="btn btn-link text-start text-decoration-none p-0 d-flex align-items-center gap-2 flex-grow-1 me-2"
                      (click)="openAttachmentPreview(file)">
                      <img
                        [src]="getPreviewUrl(file)"
                        [alt]="file.name"
                        class="attachment-thumb rounded border"
                        loading="lazy">
                      <span class="text-truncate">{{ file.name }}</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      (click)="removeFile($index)">
                      <i class="mdi mdi-close"></i>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="cancel()">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        (click)="submit()"
        [disabled]="form.invalid || isSubmitting()">
        @if (isSubmitting()) {
          <span class="spinner-border spinner-border-sm me-2"></span>
          Submitting...
        } @else {
          <i class="mdi mdi-send me-1"></i>
          Submit Ticket
        }
      </button>
    </div>
  `
})
export class ErrorReportDialogComponent implements OnDestroy {
  readonly activeModal = inject(NgbActiveModal);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);
  private readonly draftService = inject(SupportTicketDraftService);
  private readonly authService = inject(AuthenticationService);
  private readonly modalService = inject(NgbModal);

  readonly highUrgencyLevel = TicketUrgencyLevel.HIGH;
  readonly stepsPlaceholder = '1. Go to...\n2. Click on...\n3. See error';

  private readonly previewUrlMap = new Map<File, string>();

  isSubmitting = signal(false);
  selectedFiles = signal<File[]>([]);

  ticketTypes = Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  impactLevels = Object.entries(TICKET_IMPACT_LABELS).map(([value, label]) => ({ value, label }));
  urgencyLevels = Object.entries(TICKET_URGENCY_LABELS).map(([value, label]) => ({ value, label }));

  quillModules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ['link'],
        ['clean']
      ]
    }
  };

  form = this.fb.group({
    type: [TicketType.BUG, Validators.required],
    onBehalfOfSomeoneElse: [false],
    requestFor: [this.authService.currentUser()?.email ?? '', Validators.required],
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    priority: [TicketPriority.MEDIUM, Validators.required],
    impactLevel: [TicketImpactLevel.LOW, Validators.required],
    urgencyLevel: [TicketUrgencyLevel.LOW, Validators.required],
    updateRecipients: [''],
    steps: ['']
  });

  applyDraft(draft: SupportTicketDraft): void {
    this.form.patchValue({
      type: draft.type,
      onBehalfOfSomeoneElse: draft.onBehalfOfSomeoneElse,
      requestFor: draft.requestFor,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      impactLevel: draft.impactLevel,
      urgencyLevel: draft.urgencyLevel,
      updateRecipients: draft.updateRecipients,
      steps: draft.steps
    });
    this.selectedFiles.set([...(draft.selectedFiles ?? [])]);
  }

  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }

  private buildDraft(): SupportTicketDraft {
    const { type, onBehalfOfSomeoneElse, requestFor, title, description, priority, impactLevel, urgencyLevel, updateRecipients, steps } = this.form.value;
    return {
      type: (type || TicketType.BUG) as TicketType,
      onBehalfOfSomeoneElse: Boolean(onBehalfOfSomeoneElse),
      requestFor: requestFor || '',
      title: title || '',
      description: description || '',
      priority: (priority || TicketPriority.MEDIUM) as TicketPriority,
      impactLevel: (impactLevel || TicketImpactLevel.LOW) as TicketImpactLevel,
      urgencyLevel: (urgencyLevel || TicketUrgencyLevel.LOW) as TicketUrgencyLevel,
      updateRecipients: updateRecipients || '',
      steps: steps || '',
      selectedFiles: this.selectedFiles()
    };
  }

  cancel(): void {
    this.draftService.clearDraft();
    this.activeModal.dismiss('cancel');
  }

  minimize(): void {
    if (this.isSubmitting()) return;
    this.draftService.setDraft(this.buildDraft());
    this.draftService.minimize();
    this.activeModal.dismiss('minimized');
  }

  onTicketEditorCreated(editor: any): void {
    const root: HTMLElement | undefined = editor?.root;
    if (!root) return;
    root.addEventListener('paste', (event: Event) => {
      this.onPaste(event as ClipboardEvent);
    }, true);
  }

  onPaste(event: ClipboardEvent): void {
    if (event.defaultPrevented) return;
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItems = items.filter(i => i.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    event.preventDefault();
    for (const item of imageItems) {
      const blob = item.getAsFile();
      if (!blob) continue;
      if (blob.size > 5 * 1024 * 1024) {
        this.notification.error('Pasted image exceeds 5MB limit');
        continue;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = blob.type.split('/')[1] || 'png';
      const file = new File([blob], `pasted-screenshot-${timestamp}.${ext}`, { type: blob.type });
      this.selectedFiles.update(current => [...current, file]);
    }
  }

  getDescriptionPlaceholder(): string {
    switch (this.form.get('type')?.value) {
      case TicketType.BUG: return 'Describe what went wrong and what you expected to happen...';
      case TicketType.FEATURE_REQUEST: return 'Describe the feature you would like to see...';
      case TicketType.QUESTION: return 'What would you like to know?';
      case TicketType.IMPROVEMENT: return 'How can we make this better?';
      case TicketType.MAINTENANCE: return 'Describe the maintenance task needed, scope, and timing...';
      case TicketType.ACCESS_PERMISSIONS: return 'Describe which access is needed, for whom, and why...';
      case TicketType.DATA_CORRECTION: return 'Describe the incorrect data and the correct expected value...';
      case TicketType.INCIDENT_OUTAGE: return 'Describe service impact, affected users, and when it started...';
      default: return 'Provide details...';
    }
  }

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files);
  }

  private addFiles(files: File[]): void {
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) {
        this.notification.error(`${f.name} is not an image file`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        this.notification.error(`${f.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });
    if (valid.length) this.selectedFiles.update(c => [...c, ...valid]);
  }

  removeFile(index: number): void {
    const file = this.selectedFiles()[index];
    if (file) this.revokePreviewUrl(file);
    this.selectedFiles.update(c => c.filter((_, i) => i !== index));
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  getPreviewUrl(file: File): string {
    if (!this.isImageFile(file)) return '';
    const existing = this.previewUrlMap.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    this.previewUrlMap.set(file, url);
    return url;
  }

  openAttachmentPreview(file: File): void {
    const previewUrl = this.getPreviewUrl(file);
    if (!previewUrl) {
      this.notification.error('Preview is not available for this file.');
      return;
    }

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      scrollable: false,
    });

    modalRef.componentInstance.url = previewUrl;
    modalRef.componentInstance.fileName = file.name;
  }

  private revokePreviewUrl(file: File): void {
    const url = this.previewUrlMap.get(file);
    if (!url) return;
    URL.revokeObjectURL(url);
    this.previewUrlMap.delete(file);
  }

  private clearPreviewUrls(): void {
    for (const url of this.previewUrlMap.values()) URL.revokeObjectURL(url);
    this.previewUrlMap.clear();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { type, onBehalfOfSomeoneElse, requestFor, title, description, priority, impactLevel, urgencyLevel, updateRecipients, steps } = this.form.value;

      // Always include these fields in metadata for backend notification
      const metadata: Record<string, unknown> = {
        requestFor: requestFor || '',
        onBehalfOfSomeoneElse: Boolean(onBehalfOfSomeoneElse),
        impactLevel: impactLevel || TicketImpactLevel.LOW,
        urgencyLevel: urgencyLevel || TicketUrgencyLevel.LOW,
        updateRecipients: updateRecipients || '',
        browser: navigator.userAgent,
        url: window.location.href,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      };

      const ticket = {
        type: type || 'bug',
        title: title || '',
        description: description || '',
        priority: priority || 'medium',
        steps: steps || '',
        metadata
      };

      const createdTicket: any = await this.http.post('apiV2/support-tickets', ticket).toPromise();

      let failedFiles: string[] = [];
      if (this.selectedFiles().length > 0 && createdTicket?.id) {
        failedFiles = await this.uploadAttachments(createdTicket.id);
      }

      if (failedFiles.length > 0) {
        this.notification.error(
          `Ticket was created, but some attachments failed to save: ${failedFiles.join(', ')}`,
          false,
        );
      } else {
        this.notification.success('Ticket submitted successfully! We will get back to you soon.');
      }
      this.draftService.clearDraft();
      this.activeModal.close(true);
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      this.notification.error('Failed to submit ticket. Please try again.', false);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async uploadAttachments(ticketId: number): Promise<string[]> {
    const files = this.selectedFiles();
    const failedFiles: string[] = [];

    for (const file of files) {
      try {
        await this.uploadAttachmentViaTicketEndpoint(ticketId, file);
      } catch (err) {
        console.warn(`Ticket endpoint upload failed for ${file.name}, trying fallback flow:`, err);
        try {
          await this.uploadAttachmentViaFallbackFlow(ticketId, file);
        } catch (fallbackError) {
          console.warn(`Fallback upload also failed for ${file.name}:`, fallbackError);
          failedFiles.push(file.name);
        }
      }
    }

    return failedFiles;
  }

  private async uploadAttachmentViaTicketEndpoint(ticketId: number, file: File): Promise<void> {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    await this.http.post(`apiV2/support-tickets/${ticketId}/attachments/upload`, uploadFormData).toPromise();
  }

  private async uploadAttachmentViaFallbackFlow(ticketId: number, file: File): Promise<void> {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('subFolder', 'support-tickets');

    const uploaded: any = await this.http.post('apiV2/attachments/upload', uploadFormData).toPromise();
    const uploadedUrl = String(uploaded?.url || uploaded?.file_url || uploaded?.link || '').trim();

    if (!uploadedUrl) {
      throw new Error('Fallback upload API did not return file URL');
    }

    await this.http.post(`apiV2/support-tickets/${ticketId}/attachments`, {
      file_name: file.name,
      file_url: uploadedUrl,
      mime_type: file.type || null,
      file_size: file.size || null,
    }).toPromise();
  }
}
