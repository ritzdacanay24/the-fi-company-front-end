import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { FeatureType } from '@app/shared/enums/feature.enum';
import { InlineAttachmentDropzoneComponent } from '@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component';
import { UploadedAttachmentsListComponent } from '@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  selector: 'app-feature-attachments-panel',
  standalone: true,
  imports: [
    CommonModule,
    InlineAttachmentDropzoneComponent,
    UploadedAttachmentsListComponent,
  ],
  template: `
    <div class="rounded mb-3" *ngIf="showDropzone">
      <app-inline-attachment-dropzone
        [disabled]="isDropzoneDisabled"
        (filesAdded)="onAttachmentFilesAdded($event)">
      </app-inline-attachment-dropzone>
    </div>

    <app-uploaded-attachments-list
      [attachments]="attachments"
      [isLoading]="effectiveIsLoadingAttachments"
      [viewMode]="viewMode"
      [showImageThumbnails]="showImageThumbnails"
      [showDelete]="showDelete"
      [resolveById]="resolveAttachmentUrlWithOverride"
      (deleteRequested)="onDeleteAttachment($event)">
    </app-uploaded-attachments-list>
  `,
})
export class FeatureAttachmentsPanelComponent implements OnChanges {
  @Input() feature!: FeatureType;
  @Input() resourceId: number | string | null = null;
  @Input() legacyFieldNames: string[] = [];
  @Input() legacyIdField: 'uniqueId' | 'mainId' = 'uniqueId';
  @Input() disabled = false;
  @Input() viewMode: 'card' | 'table' | 'media-grid' | 'detailed-list' = 'table';
  @Input() showDropzone = true;
  @Input() showDelete = true;
  @Input() showImageThumbnails = true;

  // Optional adapter hooks for flows that do not map to feature/resource storage directly.
  @Input() attachmentsOverride: any[] | null = null;
  @Input() isLoadingOverride: boolean | null = null;
  @Input() uploadHandlerOverride: ((files: File[]) => Promise<void>) | null = null;
  @Input() deleteHandlerOverride: ((id: number, index: number) => Promise<void>) | null = null;
  @Input() resolveByIdOverride: ((id: number) => Promise<{ url: string; fileName?: string } | null>) | null = null;

  attachments: any[] = [];
  isLoadingAttachments = false;
  isUploadingAttachments = false;

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly toastrService: ToastrService,
  ) {}

  get isDropzoneDisabled(): boolean {
    return this.disabled || this.isUploadingAttachments || !this.hasResourceId;
  }

  get effectiveIsLoadingAttachments(): boolean {
    if (this.isLoadingOverride !== null) {
      return Boolean(this.isLoadingOverride);
    }

    return this.isLoadingAttachments;
  }

  private get hasResourceId(): boolean {
    const numericId = Number(this.resourceId);
    return Number.isFinite(numericId) && numericId > 0;
  }

  private get useOverrideMode(): boolean {
    return this.attachmentsOverride !== null
      || this.isLoadingOverride !== null
      || !!this.uploadHandlerOverride
      || !!this.deleteHandlerOverride
      || !!this.resolveByIdOverride;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attachmentsOverride'] && this.attachmentsOverride !== null) {
      this.attachments = this.attachmentsOverride;
    }

    const hasFeatureOrResourceChange = !!changes['feature'] || !!changes['resourceId'];
    const hasLegacyChange = !!changes['legacyFieldNames'];

    if (hasFeatureOrResourceChange || hasLegacyChange) {
      void this.loadAttachments();
    }
  }

  async loadAttachments(): Promise<void> {
    if (this.useOverrideMode) {
      this.attachments = this.attachmentsOverride || [];
      return;
    }

    if (!this.feature || !this.hasResourceId) {
      this.attachments = [];
      return;
    }

    this.isLoadingAttachments = true;

    try {
      this.attachments = await this.attachmentsService.getMergedAttachmentsByFeature(
        this.feature,
        this.resourceId!,
        this.legacyFieldNames,
        { legacyIdField: this.legacyIdField },
      );
    } finally {
      this.isLoadingAttachments = false;
    }
  }

  resolveAttachmentUrl = async (id: number): Promise<{ url: string; fileName?: string } | null> => {
    try {
      const resolved = await this.attachmentsService.getViewById(id);
      const resolvedUrl = String(resolved?.url || '').trim();

      if (!resolvedUrl) {
        return null;
      }

      return {
        url: resolvedUrl,
        fileName: resolved?.fileName,
      };
    } catch {
      return null;
    }
  };

  resolveAttachmentUrlWithOverride = async (id: number): Promise<{ url: string; fileName?: string } | null> => {
    if (this.resolveByIdOverride) {
      return this.resolveByIdOverride(id);
    }

    return this.resolveAttachmentUrl(id);
  };

  onAttachmentFilesAdded(files: File[]): void {
    if (!files?.length || this.isDropzoneDisabled || (!this.feature && !this.uploadHandlerOverride)) {
      return;
    }

    if (this.uploadHandlerOverride) {
      void this.uploadAttachmentFilesWithOverride(files);
      return;
    }

    void this.uploadAttachmentFiles(files);
  }

  onDeleteAttachment(event: { id: number; index: number }): void {
    if (this.deleteHandlerOverride) {
      void this.deleteHandlerOverride(event.id, event.index);
      return;
    }

    void this.deleteAttachment(event.id, event.index);
  }

  private async uploadAttachmentFilesWithOverride(files: File[]): Promise<void> {
    if (!this.uploadHandlerOverride) {
      return;
    }

    this.isUploadingAttachments = true;

    try {
      await this.uploadHandlerOverride(files);
      await this.loadAttachments();
    } finally {
      this.isUploadingAttachments = false;
    }
  }

  private async deleteAttachment(id: number, index: number): Promise<void> {
    const { value: shouldDelete } = await SweetAlert.confirm({
      title: 'Delete attachment?',
      text: 'This attachment will be permanently removed.',
      icon: 'warning',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (!shouldDelete) {
      return;
    }

    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
    this.toastrService.success('Attachment deleted');
  }

  private async uploadAttachmentFiles(files: File[]): Promise<void> {
    this.isUploadingAttachments = true;

    try {
      const result = await this.attachmentsService.uploadFilesByFeature(this.feature, this.resourceId!, files);

      await this.loadAttachments();

      if (result.uploaded > 0) {
        this.toastrService.success(`Uploaded ${result.uploaded} attachment${result.uploaded > 1 ? 's' : ''}`);
      } else {
        this.toastrService.warning('No files were uploaded');
      }
    } finally {
      this.isUploadingAttachments = false;
    }
  }
}
