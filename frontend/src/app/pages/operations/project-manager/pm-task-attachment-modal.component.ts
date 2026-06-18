import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { PmAttachmentType, PmTaskAttachment, PmTaskRecord } from './services/project-manager-tasks-data.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { UploadNewAttachmentsComponent } from '@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component';
import { UploadedAttachmentsListComponent } from '@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component';

@Component({
  standalone: true,
  selector: 'app-pm-task-attachment-modal',
  imports: [SharedModule, ReactiveFormsModule, UploadNewAttachmentsComponent, UploadedAttachmentsListComponent],
  template: `
    <div class="modal-header">
      <div>
        <h5 class="modal-title mb-0">Attachments</h5>
        <small class="text-muted">{{ task.taskName }}</small>
      </div>
      <button type="button" class="btn-close" (click)="close()"></button>
    </div>

    <div class="modal-body p-0">
      <div class="px-3 pt-3" style="max-height: 340px; overflow-y: auto;">
        <div *ngIf="!attachments.length" class="text-muted small py-3 text-center">
          No attachments yet.
        </div>

        <app-uploaded-attachments-list
          *ngIf="attachments.length"
          [attachments]="sharedAttachmentRows"
          [viewMode]="'table'"
          [isLoading]="isLoadingAttachments"
          [showDelete]="true"
          [disableDelete]="isUploading"
          [deleteTitle]="'Remove attachment'"
          [maxHeight]="'340px'"
          [showHelperText]="false"
          [showThumbnails]="true"
          [useSharedViewer]="true"
          [enableViewerNavigation]="true"
          (deleteRequested)="removeFromSharedList($event)">
        </app-uploaded-attachments-list>
      </div>

      <div class="border-top px-3 py-3">
        <div class="row g-2 align-items-end">
          <div class="col-6">
            <label class="form-label form-label-sm mb-1">Type</label>
            <select class="form-select form-select-sm" [formControl]="typeControl">
              <option *ngFor="let t of attachmentTypes" [value]="t">{{ t }}</option>
            </select>
          </div>
          <div class="col-6">
            <label class="form-label form-label-sm mb-1">Uploaded by</label>
            <div class="form-control form-control-sm bg-light d-flex align-items-center">{{ currentUploader }}</div>
          </div>
        </div>

        <div class="mt-3">
          <app-upload-new-attachments
            [files]="pendingFiles"
            [disabled]="isUploading"
            [accept]="'*/*'"
            [multiple]="true"
            [allowPaste]="true"
            [openPickerOnContainerClick]="false"
            [chooseLabel]="'Choose files'"
            [dropLabel]="'or drag files here.'"
            [uploadTriggerMode]="'manual'"
            [manualFlowText]="'Files are queued below. Click Upload Selected Files to upload them.'"
            (filesAdded)="onFilesAdded($event)"
            (removeRequested)="onPendingRemove($event)">
          </app-upload-new-attachments>
        </div>

        <div class="mt-2 d-flex justify-content-end">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            [disabled]="pendingFiles.length === 0 || isUploading"
            (click)="commitPendingFiles()">
            <span *ngIf="isUploading" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            <i *ngIf="!isUploading" class="mdi mdi-upload me-1"></i>
            {{ isUploading ? 'Uploading...' : 'Upload Selected Files' }}
          </button>
        </div>
      </div>
    </div>

    <div class="modal-footer py-2">
      <span class="text-muted small me-auto">{{ attachments.length }} file{{ attachments.length !== 1 ? 's' : '' }}</span>
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="close()">Close</button>
    </div>
  `,
  styles: [``]
})
export class PmTaskAttachmentModalComponent implements OnInit {
  @Input() task!: PmTaskRecord;
  @Input() initialAttachments: PmTaskAttachment[] = [];

  attachments: any[] = [];
  sharedAttachmentRows: Array<Record<string, any>> = [];
  pendingFiles: File[] = [];
  currentUploader = 'Project Manager';
  isUploading = false;
  isLoadingAttachments = false;

  private readonly attachmentField = 'Project Manager Task';
  private readonly attachmentSubFolder = 'operations/project-manager-tasks';

  readonly attachmentTypes: PmAttachmentType[] = ['Email', 'Picture', 'Document', 'Other'];

  typeControl = new FormControl<PmAttachmentType>('Document');

  constructor(
    private activeModal: NgbActiveModal,
    private authService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  async ngOnInit(): Promise<void> {
    this.attachments = [...this.initialAttachments];
    this.sharedAttachmentRows = this.mapAttachmentsForList(this.attachments);
    this.currentUploader = this.resolveCurrentUserName();
    await this.loadAttachments();
  }

  onFilesAdded(files: File[]): void {
    this.pendingFiles = [...this.pendingFiles, ...files];
  }

  onPendingRemove(index: number): void {
    this.pendingFiles = this.pendingFiles.filter((_, i) => i !== index);
  }

  async commitPendingFiles(): Promise<void> {
    if (!this.pendingFiles.length) {
      return;
    }

    const files = [...this.pendingFiles];
    const type = (this.typeControl.value || 'Document') as PmAttachmentType;
    const remainingFiles: File[] = [];

    this.isUploading = true;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', this.attachmentField);
      formData.append('uniqueData', this.getAttachmentUniqueId());
      formData.append('subFolder', this.attachmentSubFolder);
      formData.append('type_of', type);

      try {
        await this.attachmentsService.uploadfile(formData);
      } catch (error) {
        console.error('Failed to upload PM task attachment:', error);
        remainingFiles.push(file);
      }
    }

    this.pendingFiles = remainingFiles;

    try {
      await this.loadAttachments();
    } finally {
      this.isUploading = false;
    }
  }

  async removeFromSharedList(event: { id: number }): Promise<void> {
    const attachmentId = Number(event?.id);
    if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
      this.attachments = this.attachments.filter((a) => a.id !== event.id);
      this.sharedAttachmentRows = this.mapAttachmentsForList(this.attachments);
      return;
    }

    await this.attachmentsService.delete(attachmentId);
    await this.loadAttachments();
  }

  close(): void {
    this.activeModal.close(this.attachments);
  }

  private resolveCurrentUserName(): string {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      return 'Project Manager';
    }

    const nameCandidates = [
      currentUser.full_name,
      currentUser.fullName,
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
      `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
      currentUser.name,
      currentUser.username,
      currentUser.email
    ];

    const displayName = nameCandidates.find((candidate: any) => String(candidate || '').trim().length > 0);
    return String(displayName || 'Project Manager').trim();
  }

  private async loadAttachments(): Promise<void> {
    this.isLoadingAttachments = true;

    try {
      const rows = await this.attachmentsService.find({
        field: this.attachmentField,
        uniqueId: this.getAttachmentUniqueId(),
      });

      this.attachments = Array.isArray(rows) ? rows : [];
      this.sharedAttachmentRows = this.mapAttachmentsForList(this.attachments);
    } catch (error) {
      console.error('Failed to load PM task attachments:', error);
    } finally {
      this.isLoadingAttachments = false;
    }
  }

  private mapAttachmentsForList(rows: any[]): Array<Record<string, any>> {
    return (rows || []).map((a) => ({
      id: a.id,
      fileName: a.fileName || a.originalName || a.name,
      createdDate: a.createdDate || a.created_date || a.uploadedAt,
      createdByName: a.createdByName || a.uploadedBy || a.createdBy || this.currentUploader,
      fileType: a.type_of || a.type,
      link: a.link || a.url || a.dataUrl || '',
      url: a.link || a.url || a.dataUrl || '',
    }));
  }

  private getAttachmentUniqueId(): string {
    return String(this.task?.id ?? '').trim();
  }
}
