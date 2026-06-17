import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from "@angular/core";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";

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
  }
  get attachments(): any[] {
    return this._attachments;
  }
  private _attachments: any[] = [];

  @Input() viewMode: "card" | "table" = "card";
  @Input() isLoading = false;
  @Input() loadingText = "Loading attachments...";
  @Input() showThumbnails = false;
  @Input() showDelete = true;
  @Input() disableDelete = false;
  @Input() deleteTitle = "Delete attachment";
  @Input() maxHeight = "300px";
  @Input() showHelperText = true;
  @Input() helperText = "Click on filenames to preview, or use direct download links if preview fails.";
  @Input() resolvePreviewUrls = false;

  @Output() openRequested = new EventEmitter<any>();
  @Output() downloadRequested = new EventEmitter<any>();
  @Output() deleteRequested = new EventEmitter<{ id: any; index: number; row: any }>();

  private readonly attachmentsService = inject(AttachmentsService);
  private resolvedIds = new Set<number>();

  getUploaderLabel(row: any): string {
    const explicitName = row?.createdByName || row?.uploadedByName || row?.uploaderName || row?.user_name;
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
    // If resolvePreviewUrls flag is explicitly set to true, resolve URLs on demand
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
    this.openRequested.emit(row);
  }

  onDownload(row: any, event: Event): void {
    event.preventDefault();
    this.downloadRequested.emit(row);
  }

  onDelete(row: any, index: number): void {
    this.deleteRequested.emit({ id: row?.id, index, row });
  }

  onOpenFromButton(row: any): void {
    this.openRequested.emit(row);
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
}
