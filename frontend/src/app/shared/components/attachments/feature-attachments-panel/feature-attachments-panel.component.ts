import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { FeatureType } from '@app/shared/enums/feature.enum';
import { FEATURE_ATTACHMENT_CONFIG } from '@app/shared/config/feature-attachment.config';
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

    <div class="mb-3" *ngIf="showActivationControls && !effectiveIsLoadingAttachments && rawAttachments.length > 0">
      <div class="form-check form-switch">
        <input
          class="form-check-input"
          type="checkbox"
          id="show-inactive-attachments"
          [checked]="showInactive"
          (change)="toggleShowInactive($any($event.target).checked)"
        >
        <label class="form-check-label" for="show-inactive-attachments">
          Show deactivated attachments
        </label>
      </div>
    </div>

    <app-uploaded-attachments-list
      [attachments]="attachments"
      [isLoading]="effectiveIsLoadingAttachments"
      [viewMode]="viewMode"
      [showImageThumbnails]="showImageThumbnails"
      [showDelete]="showDelete"
      [showActivationActions]="showActivationControls"
      [disableActivationActions]="disabled || isUpdatingAttachmentState"
      [resolveById]="resolveAttachmentUrlWithOverride"
      (deleteRequested)="onDeleteAttachment($event)"
      (activationRequested)="onToggleAttachmentActive($event)"
      (updateRequested)="onUpdateAttachmentRecord($event)">
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
  @Input() showActivationControls = true;

  // Optional adapter hooks for flows that do not map to feature/resource storage directly.
  @Input() attachmentsOverride: any[] | null = null;
  @Input() isLoadingOverride: boolean | null = null;
  @Input() uploadHandlerOverride: ((files: File[]) => Promise<void>) | null = null;
  @Input() deleteHandlerOverride: ((id: number, index: number) => Promise<void>) | null = null;
  @Input() resolveByIdOverride: ((id: number) => Promise<{ url: string; fileName?: string } | null>) | null = null;

  attachments: any[] = [];
  rawAttachments: any[] = [];
  isLoadingAttachments = false;
  isUploadingAttachments = false;
  isUpdatingAttachmentState = false;
  showInactive = false;
  private static readonly SHOW_INACTIVE_STORAGE_KEY = 'attachments:showInactive';

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

  private get resolvedLegacyFieldNames(): string[] {
    if (Array.isArray(this.legacyFieldNames) && this.legacyFieldNames.length > 0) {
      return this.legacyFieldNames;
    }

    return FEATURE_ATTACHMENT_CONFIG[this.feature]?.legacyNames || [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['feature'] || changes['resourceId']) {
      this.restoreShowInactivePreference();
    }

    if (changes['attachmentsOverride'] && this.attachmentsOverride !== null) {
      this.rawAttachments = this.attachmentsOverride;
      this.applyAttachmentVisibility();
    }

    const hasFeatureOrResourceChange = !!changes['feature'] || !!changes['resourceId'];
    const hasLegacyChange = !!changes['legacyFieldNames'];

    if (hasFeatureOrResourceChange || hasLegacyChange) {
      void this.loadAttachments();
    }
  }

  async loadAttachments(): Promise<void> {
    if (this.useOverrideMode) {
      this.rawAttachments = this.attachmentsOverride || [];
      this.applyAttachmentVisibility();
      return;
    }

    if (!this.feature || !this.hasResourceId) {
      this.rawAttachments = [];
      this.attachments = [];
      return;
    }

    this.isLoadingAttachments = true;

    try {
      this.rawAttachments = await this.attachmentsService.getMergedAttachmentsByFeature(
        this.feature,
        this.resourceId!,
        this.resolvedLegacyFieldNames,
        { legacyIdField: this.legacyIdField },
      );
      this.applyAttachmentVisibility();
    } finally {
      this.isLoadingAttachments = false;
    }
  }

  toggleShowInactive(showInactive: boolean): void {
    this.showInactive = showInactive;
    this.persistShowInactivePreference();
    this.applyAttachmentVisibility();
  }

  private persistShowInactivePreference(): void {
    try {
      localStorage.setItem(
        FeatureAttachmentsPanelComponent.SHOW_INACTIVE_STORAGE_KEY,
        this.showInactive ? '1' : '0',
      );
    } catch {
      // Ignore storage write errors.
    }
  }

  private restoreShowInactivePreference(): void {
    try {
      const value = localStorage.getItem(FeatureAttachmentsPanelComponent.SHOW_INACTIVE_STORAGE_KEY);
      this.showInactive = value === '1';
    } catch {
      this.showInactive = false;
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

  onToggleAttachmentActive(event: { id: number; index: number; row: any; nextActive: 0 | 1 }): void {
    void this.toggleAttachmentActive(event.id, event.nextActive);
  }

  onUpdateAttachmentRecord(event: { id: number; row: any; payload: { title: string; description: string } }): void {
    void this.updateAttachmentRecord(event.id, event.payload);
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
    this.rawAttachments = this.rawAttachments.filter((row) => Number(row?.id) !== Number(id));
    this.applyAttachmentVisibility();
    this.toastrService.success('Attachment deleted');
  }

  private async toggleAttachmentActive(id: number, nextActive: 0 | 1): Promise<void> {
    const isActivating = nextActive === 1;
    const title = isActivating ? 'Activate attachment?' : 'Deactivate attachment?';
    const text = isActivating
      ? 'This attachment will be visible in the list again.'
      : 'This attachment will be hidden from the default list view.';

    const { value: shouldContinue } = await SweetAlert.confirm({
      title,
      text,
      icon: 'warning',
      confirmButtonText: isActivating ? 'Activate' : 'Deactivate',
      cancelButtonText: 'Cancel',
    });

    if (!shouldContinue) {
      return;
    }

    this.isUpdatingAttachmentState = true;

    try {
      await this.attachmentsService.setAttachmentActive(id, nextActive);

      this.rawAttachments = this.rawAttachments.map((row) => {
        if (Number(row?.id) !== Number(id)) {
          return row;
        }

        return {
          ...row,
          active: nextActive,
        };
      });

      this.applyAttachmentVisibility();
      this.toastrService.success(isActivating ? 'Attachment activated' : 'Attachment deactivated');
    } finally {
      this.isUpdatingAttachmentState = false;
    }
  }

  private async updateAttachmentRecord(id: number, payload: { title: string; description: string }): Promise<void> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return;
    }

    this.isUpdatingAttachmentState = true;

    try {
      await this.attachmentsService.update(numericId, {
        title: payload.title,
        description: payload.description,
      });

      this.rawAttachments = this.rawAttachments.map((row) => {
        if (Number(row?.id) !== numericId) {
          return row;
        }

        return {
          ...row,
          title: payload.title,
          description: payload.description,
        };
      });

      this.applyAttachmentVisibility();
      this.toastrService.success('Attachment record updated');
    } finally {
      this.isUpdatingAttachmentState = false;
    }
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

  private applyAttachmentVisibility(): void {
    const source = Array.isArray(this.rawAttachments) ? this.rawAttachments : [];
    if (this.showInactive) {
      this.attachments = source;
      return;
    }

    this.attachments = source.filter((row: any) => this.isActiveAttachment(row));
  }

  private isActiveAttachment(row: any): boolean {
    const active = row?.active;
    if (active === undefined || active === null || active === '') {
      return true;
    }

    return Number(active) !== 0;
  }
}
