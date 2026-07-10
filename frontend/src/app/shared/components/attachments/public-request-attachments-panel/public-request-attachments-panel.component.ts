import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { InlineAttachmentDropzoneComponent } from '@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component';
import { PendingAttachmentsListComponent } from '@app/shared/components/attachments/pending-attachments-list/pending-attachments-list.component';
import { UploadedAttachmentsListComponent } from '@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component';

@Component({
  selector: 'app-public-request-attachments-panel',
  standalone: true,
  imports: [
    CommonModule,
    InlineAttachmentDropzoneComponent,
    PendingAttachmentsListComponent,
    UploadedAttachmentsListComponent,
  ],
  template: `
    <div class="mb-3">
      <h6 class="text-muted mb-2">Upload Supporting Documents</h6>
      <p class="text-muted small mb-0" *ngIf="!hasRequestContext">
        Add files now. They will upload automatically after submitting the request.
      </p>
      <p class="text-muted small mb-0" *ngIf="hasRequestContext">
        Add files now. They upload automatically for this existing request.
      </p>
    </div>

    <app-inline-attachment-dropzone
      [disabled]="isDisabled"
      (filesAdded)="onPendingAttachmentFilesAdded($event)">
    </app-inline-attachment-dropzone>

    <div class="mt-3">
      <app-pending-attachments-list
        [files]="pendingFiles"
        [disabled]="isDisabled"
        [helperText]="hasRequestContext
          ? 'Selected files upload automatically for this existing request.'
          : 'Selected files are queued and will upload after request submission.'"
        (removeRequested)="removePendingAttachment($event)">
      </app-pending-attachments-list>
    </div>

    <div class="mt-3" *ngIf="attachments.length > 0">
      <h6 class="text-muted mb-2">Uploaded Files:</h6>
      <app-uploaded-attachments-list
        [attachments]="attachments"
        [showDelete]="false"
        [showThumbnails]="true"
        [showImageThumbnails]="false"
        [viewMode]="'table'"
        [useSharedViewer]="true"
        [resolveById]="resolveAttachmentUrl">
      </app-uploaded-attachments-list>
    </div>
  `,
})
export class PublicRequestAttachmentsPanelComponent implements OnChanges {
  @Input() requestId: number | string | null = null;
  @Input() token: string | null = null;
  @Input() disabled = false;
  @Input() uploadLink = '';

  pendingFiles: File[] = [];
  attachments: any[] = [];

  private isLoadingAttachments = false;
  private isUploadingAttachments = false;

  constructor(private readonly attachmentsService: AttachmentsService) {}

  get hasRequestContext(): boolean {
    const id = Number(this.requestId);
    return Number.isFinite(id) && id > 0 && !!String(this.token || '').trim();
  }

  get isDisabled(): boolean {
    return this.disabled || this.isLoadingAttachments || this.isUploadingAttachments;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestId'] || changes['token']) {
      if (this.hasRequestContext) {
        void this.loadAttachments();
        void this.uploadQueuedFilesForExistingRequest();
      } else {
        this.attachments = [];
      }
    }
  }

  onPendingAttachmentFilesAdded(files: File[]): void {
    if (!files?.length) {
      return;
    }

    this.pendingFiles = [...this.pendingFiles, ...files];

    if (this.hasRequestContext) {
      void this.uploadQueuedFilesForExistingRequest();
    }
  }

  removePendingAttachment(index: number): void {
    if (index < 0 || index >= this.pendingFiles.length) {
      return;
    }

    this.pendingFiles.splice(index, 1);
    this.pendingFiles = [...this.pendingFiles];
  }

  resolveAttachmentUrl = async (
    id: string | number,
  ): Promise<{ url: string; fileName?: string } | null> => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return null;
    }

    let match: any = null;

    // Match authenticated behavior by resolving from a fresh API response at open time.
    if (this.hasRequestContext) {
      const freshRows = await this.fetchNormalizedAttachments();
      this.attachments = freshRows;
      match = freshRows.find((attachment) => Number(attachment?.id) === numericId);
    }

    if (!match) {
      match = this.attachments.find((attachment) => Number(attachment?.id) === numericId);
    }

    if (!match) {
      return null;
    }

    const url = this.resolveAttachmentUrlFromRow(match);
    if (!url) {
      return null;
    }

    return {
      url,
      fileName: String(match?.file_name || match?.fileName || 'Attachment').trim() || 'Attachment',
    };
  };

  private async loadAttachments(): Promise<void> {
    if (!this.hasRequestContext) {
      this.attachments = [];
      return;
    }

    const numericId = Number(this.requestId);
    const token = String(this.token || '').trim();

    this.isLoadingAttachments = true;

    try {
      this.attachments = await this.fetchNormalizedAttachments(numericId, token);
    } finally {
      this.isLoadingAttachments = false;
    }
  }

  private async fetchNormalizedAttachments(
    requestId?: number,
    token?: string,
  ): Promise<any[]> {
    const numericId = Number.isFinite(Number(requestId)) ? Number(requestId) : Number(this.requestId);
    const normalizedToken = String(token || this.token || '').trim();

    if (!Number.isFinite(numericId) || numericId <= 0 || !normalizedToken) {
      return [];
    }

    const rows = await this.attachmentsService.getAttachmentByRequestId(numericId, normalizedToken);

    return (Array.isArray(rows) ? rows : []).map((row: any) => {
      const fileName = String(row?.fileName || row?.file_name || '').trim();
      const existingUrl = String(row?.file_url || row?.url || row?.link || '').trim();

      return {
        ...row,
        id: row?.id,
        file_name: fileName || 'Attachment',
        file_url: existingUrl || this.buildAttachmentUrl(fileName),
      };
    });
  }

  private async uploadQueuedFilesForExistingRequest(): Promise<void> {
    if (!this.hasRequestContext || !this.pendingFiles.length || this.isUploadingAttachments) {
      return;
    }

    const numericId = Number(this.requestId);
    const token = String(this.token || '').trim();

    const queuedFiles = [...this.pendingFiles];
    this.pendingFiles = [];
    this.isUploadingAttachments = true;

    for (const file of queuedFiles) {
      try {
        await this.attachmentsService.uploadRequestAttachmentPublic(numericId, token, file);
      } catch {
        this.pendingFiles = [...this.pendingFiles, file];
      }
    }

    this.isUploadingAttachments = false;
    await this.loadAttachments();
  }

  private resolveAttachmentUrlFromRow(row: any): string {
    return String(row?.file_url || row?.url || row?.link || '').trim();
  }

  private buildAttachmentUrl(fileName: string): string {
    if (!fileName || !this.uploadLink) {
      return '';
    }

    const trimmed = String(fileName).trim();
    if (!trimmed) {
      return '';
    }

    return `${this.uploadLink}${encodeURIComponent(trimmed)}`;
  }
}
