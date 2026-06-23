import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { PmAttachmentType, PmTaskAttachment, PmTaskRecord } from './services/project-manager-tasks-data.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { NotificationService } from '@app/core/services/notification.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { UploadNewAttachmentsComponent } from '@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component';
import { UploadedAttachmentsListComponent } from '@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component';

@Component({
  standalone: true,
  selector: 'app-pm-task-attachment-modal',
  imports: [SharedModule, UploadNewAttachmentsComponent, UploadedAttachmentsListComponent],
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
            [uploadTriggerMode]="'on-add'"
            [autoFlowText]="'Files upload automatically after you add them.'"
            (filesAdded)="onFilesAdded($event)"
            (removeRequested)="onPendingRemove($event)">
          </app-upload-new-attachments>
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
  @Input() projectId = '';
  @Input() initialAttachments: PmTaskAttachment[] = [];

  attachments: any[] = [];
  sharedAttachmentRows: Array<Record<string, any>> = [];
  pendingFiles: File[] = [];
  currentUploader = 'Project Manager';
  isUploading = false;
  isLoadingAttachments = false;

  private readonly attachmentField = 'Project Manager Task';

  readonly attachmentTypes: PmAttachmentType[] = ['Email', 'Picture', 'Document', 'Other'];

  constructor(
    private activeModal: NgbActiveModal,
    private authService: AuthenticationService,
    private attachmentsService: AttachmentsService,
    private notification: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.attachments = [...this.initialAttachments];
    this.sharedAttachmentRows = this.mapAttachmentsForList(this.attachments);
    this.currentUploader = this.resolveCurrentUserName();
    await this.loadAttachments();
  }

  onFilesAdded(files: File[]): void {
    this.pendingFiles = [...this.pendingFiles, ...files];
    void this.commitPendingFiles();
  }

  onPendingRemove(index: number): void {
    this.pendingFiles = this.pendingFiles.filter((_, i) => i !== index);
  }

  async commitPendingFiles(): Promise<void> {
    if (!this.pendingFiles.length) {
      return;
    }

    const files = [...this.pendingFiles];
    const type: PmAttachmentType = 'Document';
    const remainingFiles: File[] = [];

    this.isUploading = true;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', this.attachmentField);
      formData.append('uniqueId', this.getAttachmentUniqueId());
      formData.append('mainId', this.projectId);
      formData.append('subFolder', this.getAttachmentSubFolder());
      formData.append('type_of', type);

      try {
        await this.attachmentsService.uploadfile(formData);
      } catch (error) {
        console.error('Failed to upload PM task attachment:', error);
        remainingFiles.push(file);
      }
    }

    this.pendingFiles = remainingFiles;
    const uploadedCount = files.length - remainingFiles.length;

    try {
      await this.loadAttachments();
      if (uploadedCount > 0) {
        const label = uploadedCount === 1 ? 'Attachment uploaded.' : `${uploadedCount} attachments uploaded.`;
        this.notification.success(label);
      }
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

    const target = this.attachments.find((a) => Number(a?.id) === attachmentId);
    const fileName = String(target?.fileName || target?.originalName || target?.name || 'this attachment');
    const result = await SweetAlert.confirm({
      title: 'Remove Attachment',
      text: `Are you sure you want to remove "${fileName}"? This action cannot be undone.`,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#dc3545',
    });
    if (!result.value) {
      return;
    }

    await this.attachmentsService.delete(attachmentId);
    await this.loadAttachments();
    this.notification.success('Attachment deleted.');
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
        mainId: this.projectId,
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
    return String(this.task.id);
  }

  private getAttachmentSubFolder(): string {
    return `operations/project-manager-tasks/${this.projectId}/items`;
  }
}
