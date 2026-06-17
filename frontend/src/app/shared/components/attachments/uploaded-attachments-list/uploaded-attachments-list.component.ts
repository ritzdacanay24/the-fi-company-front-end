import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from "@angular/core";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";

@Component({
  selector: "app-uploaded-attachments-list",
  standalone: true,
  imports: [CommonModule],
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
                  [title]="row?.fileName || ''">
                  {{ row?.fileName }}
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

              <p class="small text-muted mb-2 text-truncate" [title]="row?.fileName || ''">{{ row?.fileName }}</p>
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
                class="btn btn-link p-0 text-start text-decoration-none fw-medium"
                type="button"
                [title]="row?.fileName || ''"
                (click)="onOpenFromButton(row)">
                <span class="text-truncate d-block">{{ row?.fileName }}</span>
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
          <thead class="table-light">
            <tr>
              <th scope="col" style="width: 64px;" *ngIf="showThumbnails">Media</th>
              <th scope="col">File Name</th>
              <th scope="col" style="width: 170px;">Uploaded By</th>
              <th scope="col" style="width: 190px;">Uploaded</th>
              <th scope="col" style="width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of attachments; let i = index">
              <td *ngIf="showThumbnails">
                <button
                  *ngIf="isImageAttachment(row) && !row?.__thumbnailError && resolveThumbnailUrl(row); else fileTypeIcon"
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
              <td style="min-width: 0; max-width: 0;">
                <a
                  href="#"
                  (click)="onOpen(row, $event)"
                  class="text-decoration-none d-block text-truncate"
                  [title]="row?.fileName || ''">
                  {{ row?.fileName }}
                </a>
              </td>
              <td>
                <small class="text-muted">{{ getUploaderLabel(row) }}</small>
              </td>
              <td>
                <small class="text-muted">{{ row?.createdDate | date:'MMM d, y h:mm a' }}</small>
              </td>
              <td>
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
export class UploadedAttachmentsListComponent implements OnChanges {
  @Input() set attachments(value: any[]) {
    this._attachments = value;

    // When eager preview resolution is enabled, resolve signed URLs as rows arrive.
    if (this.resolvePreviewUrls && this._attachments?.length > 0) {
      this.resolvedIds.clear();
      this.resolveAttachmentUrls();
    }
  }
  get attachments(): any[] {
    return this._attachments;
  }
  private _attachments: any[] = [];

  @Input() viewMode: "card" | "table" | "media-grid" | "detailed-list" = "card";
  @Input() isLoading = false;
  @Input() loadingText = "Loading attachments...";
  @Input() showThumbnails = false;
  @Input() showDelete = true;
  @Input() disableDelete = false;
  @Input() deleteTitle = "Delete attachment";
  @Input() maxHeight = "300px";
  @Input() showHelperText = true;
  @Input() helperText = "Click on filenames to preview, or use direct download links if preview fails.";
  @Input() showMediaBadge = false;
  @Input() resolvePreviewUrls = false;
  @Input() showMissingSourceWarning = false;
  @Input() missingSourceText = "Missing file source. Reupload required for preview/download.";
  @Input() useSharedViewer = false;
  @Input() enableViewerNavigation = true;
  @Input() resolveById?: (id: string | number) => Promise<{ url: string; fileName?: string } | null>;

  @Output() openRequested = new EventEmitter<any>();
  @Output() downloadRequested = new EventEmitter<any>();
  @Output() deleteRequested = new EventEmitter<{ id: any; index: number; row: any }>();

  private readonly attachmentsService = inject(AttachmentsService);
  private readonly modalService = inject(NgbModal);
  private resolvedIds = new Set<number>();

  getUploaderLabel(row: any): string {
    const explicitName = row?.createdByName || row?.uploadedByName || row?.uploadedBy || row?.uploaderName || row?.user_name || row?.createdBy;
    if (explicitName) {
      return String(explicitName);
    }

    if (row?.createdBy !== undefined && row?.createdBy !== null && row?.createdBy !== "") {
      return `User #${row.createdBy}`;
    }

    if (row?.created_by !== undefined && row?.created_by !== null && row?.created_by !== "") {
      return `User #${row.created_by}`;
    }

    return "Unknown";
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If resolvePreviewUrls flag is explicitly set to true, resolve URLs for current rows.
    if (changes['resolvePreviewUrls'] && this.resolvePreviewUrls && this._attachments?.length > 0) {
      this.resolvedIds.clear();
      this.resolveAttachmentUrls();
    }
  }

  private resolveAttachmentUrls(): void {
    if (!this.attachments || this.attachments.length === 0) {
      return;
    }

    this.attachments.forEach((attachment, index) => {
      if (attachment && attachment.id && !this.resolvedIds.has(attachment.id)) {
        this.resolvedIds.add(attachment.id);
        
        this.attachmentsService
          .getViewById(attachment.id)
          .then((response: any) => {
            const signedUrl = response?.url || response?.previewUrl;
            if (signedUrl) {
              // Create a new reference to trigger change detection
              this.attachments[index] = {
                ...attachment,
                previewUrl: signedUrl,
              };
            }
          })
          .catch((err) => {
            console.warn(`Failed to resolve preview URL for attachment ${attachment.id}:`, err);
          });
      }
    });
  }

  onOpen(row: any, event: Event): void {
    event.preventDefault();

    if (this.useSharedViewer) {
      this.openInSharedViewer(row);
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

  onOpenFromButton(row: any): void {
    if (this.useSharedViewer) {
      this.openInSharedViewer(row);
      return;
    }

    this.openRequested.emit(row);
  }

  private openInSharedViewer(row: any): void {
    const items = (this.attachments || []).map((attachment) => ({
      id: attachment?.id,
      url: this.normalizeAttachmentUrl(String(attachment?.previewUrl || attachment?.link || attachment?.url || "").trim()),
      fileName: attachment?.fileName || "Attachment",
    }));

    const activeId = row?.id;
    const index = items.findIndex((item) => item.id === activeId);
    const initialIndex = index >= 0 ? index : 0;
    const initialItem = items[initialIndex];

    if (!initialItem?.url && !initialItem?.id) {
      return;
    }

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: "xl",
      centered: true,
      scrollable: true,
    });

    modalRef.componentInstance.url = initialItem?.url || "";
    modalRef.componentInstance.fileName = initialItem?.fileName || "Attachment";
    modalRef.componentInstance.items = items;
    modalRef.componentInstance.initialIndex = initialIndex;
    modalRef.componentInstance.enableNavigation = this.enableViewerNavigation;
    modalRef.componentInstance.resolveById = async (id: string | number) => {
      if (this.resolveById) {
        return this.resolveById(id);
      }

      try {
        const resolved = await this.attachmentsService.getViewById(Number(id));
        return {
          url: this.normalizeAttachmentUrl(String(resolved?.url || "").trim()),
          fileName: resolved?.fileName,
        };
      } catch {
        return null;
      }
    };
  }

  private async downloadFromSharedViewer(row: any): Promise<void> {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) {
      const fallbackUrl = this.normalizeAttachmentUrl(String(row?.previewUrl || row?.link || row?.url || "").trim());
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener");
      }
      return;
    }

    try {
      const resolved = this.resolveById
        ? await this.resolveById(id)
        : await this.attachmentsService.getViewById(id);
      const resolvedUrl = this.normalizeAttachmentUrl(String(resolved?.url || "").trim());
      if (resolvedUrl) {
        window.open(resolvedUrl, "_blank", "noopener");
      }
    } catch {
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

  isImageAttachment(row: any): boolean {
    if (row?.isImage) {
      return true;
    }

    const fileName = String(row?.fileName || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(fileName);
  }

  resolveThumbnailUrl(row: any): string {
    return String(row?.previewUrl || row?.link || '');
  }

  onThumbnailError(row: any): void {
    row.__thumbnailError = true;
  }

  private getExtension(row: any): string {
    const fromExt = String(row?.ext || '').trim().toLowerCase();
    if (fromExt) {
      return fromExt;
    }

    const fileName = String(row?.fileName || '').toLowerCase();
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
