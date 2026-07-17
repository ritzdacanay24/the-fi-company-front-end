import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { NgbDropdownModule, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";
import { AttachmentRecordModalComponent } from "@app/shared/components/attachments/attachment-record-modal/attachment-record-modal.component";

@Component({
  selector: "app-uploaded-attachments-list",
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  template: `
    <div class="mb-3" *ngIf="isLoading">
      <div class="alert alert-info py-2 d-flex align-items-center mb-0" role="status">
        <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        <span>{{ loadingText }}</span>
      </div>
    </div>

    <div class="mb-3" *ngIf="!isLoading && attachments?.length > 0 && viewMode === 'card'">
      <div class="row g-3" [style.max-height]="maxHeight" style="overflow-y: auto;">
        <div class="col-md-6" *ngFor="let row of attachments; let i = index">
          <div class="border rounded p-3 d-flex justify-content-between align-items-start">
            <div class="flex-grow-1" style="min-width: 0;">
              <h6 class="mb-1">
                <a
                  href="#"
                  (click)="onOpen(row, $event)"
                  class="text-decoration-none qir-attachment-name d-block text-truncate"
                  [title]="getFileName(row)">
                  {{ getFileName(row) }}
                </a>
              </h6>
              <small class="text-muted">{{ row?.createdDate | date:'MMM d, y h:mm a' }}</small>
              <div class="mt-2">
                <small class="text-muted">
                  Can't open?
                  <a href="#" (click)="onDownload(row, $event)" class="link-primary">Download directly</a>
                </small>
              </div>
            </div>
            <button
              *ngIf="showDelete"
              class="btn btn-sm btn-outline-danger ms-2"
              [disabled]="disableDelete"
              [title]="deleteTitle"
              (click)="onDelete(row, i)">
              <i class="mdi mdi-delete"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="form-text mt-2" *ngIf="showHelperText">
        <i class="mdi mdi-information-outline me-1"></i>
        {{ helperText }}
      </div>
    </div>

    <div class="mb-3" *ngIf="!isLoading && attachments?.length > 0 && viewMode === 'media-grid'">
      <div class="row g-3" [style.max-height]="maxHeight" style="overflow-y: auto;">
        <div class="col-6 col-md-4 col-lg-3" *ngFor="let row of attachments; let i = index">
          <div class="card h-100 border shadow-sm">
            <div class="card-body text-center">
              <div class="mb-2" *ngIf="showMediaBadge">
                <span class="badge bg-primary">{{ getMediaBadgeLabel(row) }}</span>
              </div>

              <button
                *ngIf="isImageAttachment(row) && !row?.__thumbnailError && resolveThumbnailUrl(row); else mediaPlaceholder"
                type="button"
                class="btn p-0 border-0 bg-transparent"
                title="Preview image"
                aria-label="Preview image"
                (click)="onOpenFromButton(row)">
                <img
                  [src]="resolveThumbnailUrl(row)"
                  alt=""
                  (error)="onThumbnailError(row)"
                  class="img-thumbnail mb-2"
                  style="max-height: 200px; width: 100%; object-fit: cover;" />
              </button>

              <ng-template #mediaPlaceholder>
                <button
                  type="button"
                  class="btn w-100 d-flex flex-column align-items-center justify-content-center border rounded bg-body-tertiary mb-2"
                  style="height: 150px;"
                  title="Open attachment"
                  aria-label="Open attachment"
                  (click)="onOpenFromButton(row)">
                  <i [ngClass]="getFileTypeIconClass(row)" style="font-size: 2rem;"></i>
                  <small class="text-muted mt-2">Click to view</small>
                </button>
              </ng-template>

              <p class="small text-muted mb-2 text-truncate" [title]="getFileName(row)">{{ getFileName(row) }}</p>
              <div class="d-flex justify-content-center gap-2">
                <button
                  class="btn btn-sm btn-outline-primary"
                  type="button"
                  title="Download attachment"
                  aria-label="Download attachment"
                  (click)="onDownload(row, $event)">
                  <i class="mdi mdi-download"></i>
                </button>
                <button
                  *ngIf="showDelete"
                  class="btn btn-sm btn-outline-danger"
                  [disabled]="disableDelete"
                  [title]="deleteTitle"
                  aria-label="Delete attachment"
                  type="button"
                  (click)="onDelete(row, i)">
                  <i class="mdi mdi-delete"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-text mt-2" *ngIf="showHelperText">
        <i class="mdi mdi-information-outline me-1"></i>
        {{ helperText }}
      </div>
    </div>

    <div class="mb-3" *ngIf="!isLoading && attachments?.length > 0 && viewMode === 'detailed-list'">
      <div class="border rounded" [style.max-height]="maxHeight" style="overflow-y: auto;">
        <div class="p-2 border-bottom" *ngFor="let row of attachments; let i = index; let isLast = last" [class.border-bottom-0]="isLast">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="flex-grow-1" style="min-width: 0;">
              <button
                class="btn btn-link p-0 text-start text-decoration-underline fw-medium"
                type="button"
                [title]="getFileName(row)"
                (click)="onOpenFromButton(row)">
                <span class="text-truncate d-block">{{ getFileName(row) }}</span>
              </button>

              <div class="small text-warning-emphasis mt-1" *ngIf="showMissingSourceWarning && !hasPreviewSource(row)">
                <i class="mdi mdi-alert-circle-outline me-1"></i>
                {{ missingSourceText }}
              </div>

              <div class="small text-muted mt-1">
                Uploaded by {{ getUploaderLabel(row) }}
              </div>
              <div class="small text-muted">
                {{ formatFileSize(getFileSize(row)) }} | {{ getUploadedDate(row) | date:'MMM d, y h:mm a' }}
              </div>
            </div>

            <div class="d-flex align-items-center gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                type="button"
                title="Download attachment"
                aria-label="Download attachment"
                (click)="onDownload(row, $event)">
                <i class="mdi mdi-download"></i>
              </button>
              <button
                *ngIf="showDelete"
                class="btn btn-sm btn-outline-danger"
                [disabled]="disableDelete"
                [title]="deleteTitle"
                aria-label="Delete attachment"
                type="button"
                (click)="onDelete(row, i)">
                <i class="mdi mdi-delete"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="form-text mt-2" *ngIf="showHelperText">
        <i class="mdi mdi-information-outline me-1"></i>
        {{ helperText }}
      </div>
    </div>

    <div class="mb-3" *ngIf="!isLoading && attachments?.length > 0 && viewMode === 'table'">
      <div class="table-responsive border rounded" [style.max-height]="maxHeight" style="overflow-y: auto;">
        <table class="table table-sm align-middle mb-0">
          <thead class="table-light sticky-top" style="z-index: 2;">
            <tr>
              <th scope="col" style="width: 64px;" *ngIf="showThumbnails">Media</th>
              <th scope="col">File Name</th>
              <th scope="col" style="width: 170px;">
                <span class="d-inline-block text-truncate align-middle" style="max-width: 150px; white-space: nowrap;" title="Uploaded By">
                  Uploaded By
                </span>
              </th>
              <th scope="col" style="width: 190px;">
                <span class="d-inline-block text-truncate align-middle" style="max-width: 170px; white-space: nowrap;" title="Uploaded">
                  Uploaded
                </span>
              </th>
              <th scope="col" style="width: 100px;">Status</th>
              <th scope="col" style="width: 130px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of attachments; let i = index">
              <td *ngIf="showThumbnails">
                <button
                  *ngIf="showImageThumbnails && isImageAttachment(row) && !row?.__thumbnailError && resolveThumbnailUrl(row); else fileTypeIcon"
                  type="button"
                  class="btn p-0 border-0 bg-transparent"
                  title="Preview image"
                  aria-label="Preview image"
                  (click)="onOpenFromButton(row)">
                  <img
                    [src]="resolveThumbnailUrl(row)"
                    alt=""
                    (error)="onThumbnailError(row)"
                    class="rounded-2 border border-secondary-subtle bg-body-tertiary object-fit-cover"
                    style="width: 40px; height: 40px;" />
                </button>
                <ng-template #fileTypeIcon>
                  <span class="d-inline-flex align-items-center justify-content-center rounded-2 border border-secondary-subtle bg-body-tertiary"
                    [title]="getFileTypeLabel(row)"
                    style="width: 40px; height: 40px;">
                    <i [ngClass]="getFileTypeIconClass(row)"></i>
                  </span>
                </ng-template>
              </td>
              <td style="min-width: 220px; max-width: 320px;">
                <a
                  href="#"
                  (click)="onOpen(row, $event)"
                  class="text-decoration-underline d-inline-block text-truncate align-middle"
                  style="max-width: 300px;"
                  [title]="getFileName(row)">
                  {{ getFileName(row) }}
                </a>
              </td>
              <td style="width: 170px;">
                <small class="text-muted d-inline-block text-truncate align-middle" style="max-width: 150px; white-space: nowrap;" [title]="getUploaderLabel(row)">
                  {{ getUploaderLabel(row) }}
                </small>
              </td>
              <td style="width: 190px;">
                <small
                  class="text-muted d-inline-block text-truncate align-middle"
                  style="max-width: 170px; white-space: nowrap;"
                  [title]="(getUploadedDate(row) | date:'MMM d, y h:mm a') || ''">
                  {{ getUploadedDate(row) | date:'MMM d, y h:mm a' }}
                </small>
              </td>
              <td style="width: 100px;">
                <span class="badge" [ngClass]="isAttachmentActive(row) ? 'bg-success-subtle text-success-emphasis border border-success-subtle' : 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle'">
                  {{ isAttachmentActive(row) ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div ngbDropdown container="body" class="d-inline-block">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    ngbDropdownToggle
                    aria-expanded="false"
                    title="Attachment actions"
                    aria-label="Attachment actions">
                    Actions
                  </button>
                  <ul ngbDropdownMenu class="dropdown-menu dropdown-menu-end">
                    <li>
                      <button ngbDropdownItem type="button" (click)="onOpenFromButton(row)">
                        Open
                      </button>
                    </li>
                    <li>
                      <button ngbDropdownItem type="button" (click)="onDownloadFromButton(row)">
                        Download
                      </button>
                    </li>
                    <li>
                      <button ngbDropdownItem type="button" (click)="onEditRecord(row)">
                        Record Details
                      </button>
                    </li>
                    <li *ngIf="showActivationActions"><hr class="dropdown-divider"></li>
                    <li *ngIf="showActivationActions">
                      <button
                        ngbDropdownItem
                        type="button"
                        [disabled]="disableActivationActions"
                        (click)="onToggleActive(row, i)">
                        {{ isAttachmentActive(row) ? 'Hide From List' : 'Show In List' }}
                      </button>
                    </li>
                    <li *ngIf="showDelete"><hr class="dropdown-divider"></li>
                    <li *ngIf="showDelete">
                      <button
                        ngbDropdownItem
                        class="text-danger"
                        type="button"
                        [disabled]="disableDelete"
                        (click)="onDelete(row, i)">
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="form-text mt-2" *ngIf="showHelperText">
        <i class="mdi mdi-information-outline me-1"></i>
        {{ helperText }}
      </div>
    </div>
  `,
})
export class UploadedAttachmentsListComponent {
  @Input() set attachments(value: any[]) {
    this._attachments = value;
  }
  get attachments(): any[] {
    return this._attachments;
  }
  private _attachments: any[] = [];

  @Input() viewMode: "card" | "table" | "media-grid" | "detailed-list" = "table";
  @Input() isLoading = false;
  @Input() loadingText = "Loading attachments...";
  @Input() showThumbnails = true;
  @Input() showImageThumbnails = true;
  @Input() showDelete = true;
  @Input() showActivationActions = false;
  @Input() disableActivationActions = false;
  @Input() disableDelete = false;
  @Input() deleteTitle = "Delete attachment";
  @Input() maxHeight = "300px";
  @Input() showHelperText = false;
  @Input() helperText = "Click on filenames to preview, or use direct download links if preview fails.";
  @Input() showMediaBadge = false;
  @Input() showMissingSourceWarning = false;
  @Input() missingSourceText = "Missing file source. Reupload required for preview/download.";
  @Input() useSharedViewer = true;
  @Input() enableViewerNavigation = true;
  @Input() resolveById?: (id: string | number) => Promise<{ url: string; fileName?: string } | null>;

  @Output() openRequested = new EventEmitter<any>();
  @Output() downloadRequested = new EventEmitter<any>();
  @Output() deleteRequested = new EventEmitter<{ id: any; index: number; row: any }>();
  @Output() activationRequested = new EventEmitter<{ id: any; index: number; row: any; nextActive: 0 | 1 }>();
  @Output() updateRequested = new EventEmitter<{ id: any; row: any; payload: { title: string; description: string } }>();

  private readonly modalService = inject(NgbModal);

  getUploaderLabel(row: any): string {
    const explicitName =
      this.getNonNumericText(row?.createdByName) ||
      this.getNonNumericText(row?.uploadedByName) ||
      this.getNonNumericText(row?.uploaderName) ||
      this.getNonNumericText(row?.user_name) ||
      this.getNonNumericText(row?.created_by_name);

    if (explicitName) {
      return explicitName;
    }

    if (row?.uploaded_by !== undefined && row?.uploaded_by !== null && row?.uploaded_by !== "") {
      return `User #${row.uploaded_by}`;
    }

    if (row?.createdBy !== undefined && row?.createdBy !== null && row?.createdBy !== "") {
      return `User #${row.createdBy}`;
    }

    if (row?.created_by !== undefined && row?.created_by !== null && row?.created_by !== "") {
      return `User #${row.created_by}`;
    }

    return "Unknown";
  }

  getFileName(row: any): string {
    const value =
      row?.file_name ??
      row?.fileName ??
      row?.name ??
      row?.filename ??
      row?.originalName ??
      row?.original_name ??
      "";

    const normalized = String(value).trim();
    return normalized || "Attachment";
  }

  private getNonNumericText(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();
    if (!text) {
      return null;
    }

    // Pure numeric values are IDs, not display names.
    if (/^\d+$/.test(text)) {
      return null;
    }

    return text;
  }

  onOpen(row: any, event: Event): void {
    event.preventDefault();

    if (this.useSharedViewer) {
      void this.openInSharedViewer(row);
      return;
    }

    this.openRequested.emit(row);
  }

  onDownload(row: any, event: Event): void {
    event.preventDefault();

    if (this.useSharedViewer) {
      this.downloadFromSharedViewer(row);
      return;
    }

    this.downloadRequested.emit(row);
  }

  onDelete(row: any, index: number): void {
    this.deleteRequested.emit({ id: row?.id, index, row });
  }

  onToggleActive(row: any, index: number): void {
    const nextActive: 0 | 1 = this.isAttachmentActive(row) ? 0 : 1;
    this.activationRequested.emit({ id: row?.id, index, row, nextActive });
  }

  isAttachmentActive(row: any): boolean {
    const active = row?.active;
    if (active === undefined || active === null || active === '') {
      return true;
    }

    return Number(active) !== 0;
  }

  onOpenFromButton(row: any): void {
    if (this.useSharedViewer) {
      void this.openInSharedViewer(row);
      return;
    }

    this.openRequested.emit(row);
  }

  onDownloadFromButton(row: any): void {
    if (this.useSharedViewer) {
      this.downloadFromSharedViewer(row);
      return;
    }

    this.downloadRequested.emit(row);
  }

  onEditRecord(row: any): void {
    const modalRef = this.modalService.open(AttachmentRecordModalComponent, {
      centered: true,
      size: "lg",
      backdrop: "static",
    });

    modalRef.componentInstance.attachmentId = row?.id ?? null;
    modalRef.componentInstance.fileName = this.getFileName(row);
    modalRef.componentInstance.isActive = this.isAttachmentActive(row);
    modalRef.componentInstance.initialTitle = String(row?.title || "").trim();
    modalRef.componentInstance.initialDescription = String(row?.description || "").trim();
    modalRef.componentInstance.mainId = row?.main_id ?? row?.mainId ?? row?.ticket_id ?? null;
    modalRef.componentInstance.extension = String(row?.ext || row?.mime_type || "").trim();
    modalRef.componentInstance.createdBy = this.getUploaderLabel(row);
    modalRef.componentInstance.fieldName = String(row?.field || "").trim();
    modalRef.componentInstance.storageBucket = String(row?.storage_bucket || row?.bucket || "").trim();
    modalRef.componentInstance.storageSource = String(row?.storage_source || "").trim();
    modalRef.componentInstance.storageKey = String(row?.storage_key || "").trim();
    modalRef.componentInstance.createdAt = this.getUploadedDate(row);

    modalRef.result
      .then((result: any) => {
        if (!result) {
          return;
        }

        this.updateRequested.emit({
          id: row?.id,
          row,
          payload: {
            title: String(result?.title || "").trim(),
            description: String(result?.description || "").trim(),
          },
        });
      })
      .catch(() => {
        // Dismissed.
      });
  }

  private async openInSharedViewer(row: any): Promise<void> {
    const items = (this.attachments || []).map((attachment) => ({
      id: this.toNumericAttachmentId(attachment?.id),
      url: this.normalizeAttachmentUrl(
        String(
          attachment?.file_url ||
          attachment?.previewUrl ||
          attachment?.dataUrl ||
          attachment?.link ||
          attachment?.url ||
          attachment?.path ||
          attachment?.filePath ||
          "",
        ).trim(),
      ),
      fileName: attachment?.file_name || attachment?.fileName || "Attachment",
    }));

    const activeId = this.toNumericAttachmentId(row?.id);
    const idIndex = activeId !== null ? items.findIndex((item) => item.id === activeId) : -1;
    const index = idIndex >= 0 ? idIndex : this._attachments.indexOf(row);
    const initialIndex = index >= 0 ? index : 0;
    let initialItem = items[initialIndex];

    if (activeId !== null && this.resolveById) {
      try {
        const fresh = await this.resolveById(activeId);
        const freshUrl = this.normalizeAttachmentUrl(String(fresh?.url || "").trim());
        if (freshUrl) {
          initialItem = {
            ...initialItem,
            url: freshUrl,
            fileName: fresh?.fileName || initialItem?.fileName,
          };
          items[initialIndex] = initialItem;
        }
      } catch {
        // Keep existing URL if on-demand resolve fails.
      }
    }

    if (!initialItem?.url) {
      return;
    }

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: "xl",
      centered: true,
      scrollable: true,
    });

    modalRef.componentInstance.url = initialItem?.url;
    modalRef.componentInstance.fileName = initialItem?.fileName || "Attachment";
    modalRef.componentInstance.items = items;
    modalRef.componentInstance.initialIndex = initialIndex;
    modalRef.componentInstance.enableNavigation = this.enableViewerNavigation;
    modalRef.componentInstance.resolveById = async (id: string | number) => {
      if (this.resolveById) {
        return this.resolveById(id);
      }

      // Find the attachment by ID and return its signed URL
      const attachment = this._attachments.find(a => this.toNumericAttachmentId(a?.id) === this.toNumericAttachmentId(id));
      if (attachment?.file_url) {
        return {
          url: this.normalizeAttachmentUrl(String(attachment.file_url).trim()),
          fileName: attachment?.file_name || attachment?.fileName,
        };
      }

      return null;
    };
  }

  private async downloadFromSharedViewer(row: any): Promise<void> {
    const id = Number(row?.id);
    
    // First, try to get the signed URL directly from the attachment object
    const signedUrl = row?.file_url || row?.previewUrl || row?.dataUrl || row?.link || row?.url || row?.path || row?.filePath;
    if (signedUrl) {
      window.open(this.normalizeAttachmentUrl(String(signedUrl).trim()), "_blank", "noopener");
      return;
    }

    // If no URL in object and resolveById is available, use it
    if (!Number.isFinite(id) || !this.resolveById) {
      return;
    }

    try {
      const resolved = await this.resolveById(id);
      const resolvedUrl = this.normalizeAttachmentUrl(String(resolved?.url || "").trim());
      if (resolvedUrl) {
        window.open(resolvedUrl, "_blank", "noopener");
      }
    } catch {
      // Silent fail
    }
  }

  private normalizeAttachmentUrl(rawUrl: string): string {
    if (!rawUrl) {
      return "";
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }

    if (rawUrl.startsWith("/attachments/")) {
      return `https://dashboard.eye-fi.com${rawUrl}`;
    }

    if (rawUrl.startsWith("/")) {
      return `${window.location.origin}${rawUrl}`;
    }

    return rawUrl;
  }

  private toNumericAttachmentId(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  isImageAttachment(row: any): boolean {
    if (row?.isImage) {
      return true;
    }

    const fileName = this.getFileName(row).toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(fileName);
  }

  resolveThumbnailUrl(row: any): string {
    return String(row?.file_url || row?.previewUrl || row?.dataUrl || row?.link || row?.url || '');
  }

  onThumbnailError(row: any): void {
    row.__thumbnailError = true;
  }

  private getExtension(row: any): string {
    const fromExt = String(row?.ext || '').trim().toLowerCase();
    if (fromExt) {
      if (fromExt.includes('/')) {
        return fromExt.split('/').pop() || '';
      }
      return fromExt;
    }

    const fileName = this.getFileName(row).toLowerCase();
    const match = fileName.match(/\.([a-z0-9]+)$/i);
    return match?.[1] || '';
  }

  getFileTypeIconClass(row: any): string {
    const ext = this.getExtension(row);

    if (['pdf'].includes(ext)) return 'mdi mdi-file-pdf-box text-danger';
    if (['doc', 'docx'].includes(ext)) return 'mdi mdi-file-word text-primary';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'mdi mdi-file-excel text-success';
    if (['ppt', 'pptx'].includes(ext)) return 'mdi mdi-file-powerpoint text-warning';
    if (['msg', 'eml'].includes(ext)) return 'mdi mdi-email-outline text-info';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'mdi mdi-file-video text-info';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'mdi mdi-folder-zip text-secondary';
    if (['txt', 'md', 'log'].includes(ext)) return 'mdi mdi-file-document-outline text-muted';

    return 'mdi mdi-file-outline text-muted';
  }

  getFileTypeLabel(row: any): string {
    const ext = this.getExtension(row);
    if (!ext) return 'File';

    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'Video file';
    if (ext === 'pdf') return 'PDF document';
    if (['doc', 'docx'].includes(ext)) return 'Word document';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Spreadsheet';
    if (['ppt', 'pptx'].includes(ext)) return 'Presentation';
    if (['msg', 'eml'].includes(ext)) return 'Email message';

    return `${ext.toUpperCase()} file`;
  }

  getMediaBadgeLabel(row: any): string {
    const title = String(row?.title || '').trim();
    if (!title) {
      return 'Attachment';
    }

    return title
      .replace(/^Vehicle\s+/i, '')
      .replace(/\s+View$/i, '')
      .replace(/\s+Photo\s*\d*$/i, '')
      .trim() || 'Attachment';
  }

  hasPreviewSource(row: any): boolean {
    return !!(
      row?.previewUrl ||
      row?.dataUrl ||
      row?.url ||
      row?.link ||
      row?.path ||
      row?.filePath ||
      row?.storageKey ||
      row?.storage_key ||
      row?.s3Key ||
      row?.s3_key ||
      row?.objectKey ||
      row?.storedFileName
    );
  }

  getUploadedDate(row: any): any {
    return row?.createdDate || row?.uploadedAt || row?.created_at || row?.createdAt || null;
  }

  formatFileSize(size: any): string {
    const parsed = Number(size);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "Unknown size";
    }

    if (parsed < 1024) {
      return `${parsed} B`;
    }

    const kb = parsed / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }

    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  getFileSize(row: any): any {
    return row?.fileSize ?? row?.size ?? row?.file_size ?? row?.bytes ?? row?.contentLength ?? null;
  }
}
