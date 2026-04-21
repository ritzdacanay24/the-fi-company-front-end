import { CommonModule } from "@angular/common";
import { SafeResourceUrl, DomSanitizer } from "@angular/platform-browser";
import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

interface FileViewerItem {
  id?: string | number;
  url?: string;
  fileName?: string;
}

@Component({
  selector: "app-file-viewer-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title d-flex align-items-center gap-2">
        <i class="mdi mdi-file-eye"></i>
        <span [title]="fileName">{{ fileName || "Attachment" }}</span>
        @if (showNavigation()) {
          <span class="badge bg-secondary">{{ currentIndex + 1 }} / {{ items.length }}</span>
        }
      </h5>
      <div class="header-actions d-flex align-items-center gap-2 ms-auto">
        @if (showNavigation()) {
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="previousItem()" [disabled]="!canPrevious() || resolvingItem">
            <i class="mdi mdi-chevron-left"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="nextItem()" [disabled]="!canNext() || resolvingItem">
            <i class="mdi mdi-chevron-right"></i>
          </button>
        }
        <button type="button" class="btn-close ms-1" aria-label="Close" (click)="activeModal.dismiss()"></button>
      </div>
    </div>

    <div class="modal-body p-0">
      <div class="viewer-container">
        @if (resolvingItem) {
          <div class="preview-unavailable">
            <div class="spinner-border text-primary" role="status"></div>
            <h5 class="mt-3">Loading File...</h5>
          </div>
        } @else if (isImage() && !imageLoadError) {
          <div class="image-viewer">
            <img
              [src]="url"
              [alt]="fileName"
              [style.transform]="'scale(' + zoomLevel + ')'"
              (error)="onImageError()"
              (load)="onImageLoad()"
            />
          </div>
          <div class="zoom-controls">
            <button type="button" (click)="zoomOut()" [disabled]="zoomLevel <= 0.5" title="Zoom out">
              <i class="mdi mdi-minus"></i>
            </button>
            <button type="button" (click)="resetZoom()" title="Reset zoom">
              <i class="mdi mdi-refresh"></i>
            </button>
            <button type="button" (click)="zoomIn()" [disabled]="zoomLevel >= 3" title="Zoom in">
              <i class="mdi mdi-plus"></i>
            </button>
          </div>
        } @else if (isImage() && imageLoadError) {
          <div class="preview-unavailable">
            <i class="mdi mdi-image-broken-variant preview-icon"></i>
            <h5>Image Preview Unavailable</h5>
            <p>The image could not be loaded from the current URL.</p>
            <div class="d-flex justify-content-center gap-2">
              <a [href]="url" target="_blank" class="btn btn-outline-primary">Open in New Tab</a>
              <a [href]="url" download class="btn btn-primary">Download</a>
            </div>
          </div>
        } @else if (isPdf()) {
          <iframe [src]="safeUrl" class="pdf-viewer"></iframe>
        } @else if (isOfficeDocument()) {
          <iframe [src]="safeOfficeUrl" class="pdf-viewer"></iframe>
        } @else if (isVideo()) {
          <video [src]="url" controls class="pdf-viewer"></video>
        } @else {
          <div class="preview-unavailable">
            <i class="mdi mdi-file-document-outline preview-icon"></i>
            <h5>Preview Not Available</h5>
            <p>This file type cannot be previewed in the browser.</p>
            <div class="d-flex justify-content-center gap-2">
              <a [href]="url" target="_blank" class="btn btn-outline-primary">Open in New Tab</a>
              <a [href]="url" download class="btn btn-primary">Download</a>
            </div>
          </div>
        }
      </div>
    </div>

    <div class="modal-footer">
      <a [href]="url" target="_blank" class="btn btn-outline-secondary">
        <i class="mdi mdi-open-in-new me-1"></i>
        Open in New Tab
      </a>
      <a [href]="url" download class="btn btn-outline-primary">
        <i class="mdi mdi-download me-1"></i>
        Download
      </a>
      <button type="button" class="btn btn-secondary" (click)="activeModal.dismiss()">Close</button>
    </div>
  `,
  styles: [
    `
      .viewer-container {
        min-height: 70vh;
        max-height: 80vh;
        background: var(--bs-secondary-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .image-viewer {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }

      .image-viewer img {
        max-width: 100%;
        max-height: 75vh;
        object-fit: contain;
      }

      .pdf-viewer {
        width: 100%;
        min-height: 70vh;
        border: 0;
        background: var(--bs-body-bg);
      }

      .zoom-controls {
        position: absolute;
        right: 1rem;
        bottom: 1rem;
        display: flex;
        gap: 0.5rem;
        background: rgba(0, 0, 0, 0.75);
        border-radius: 0.5rem;
        padding: 0.5rem;
      }

      .zoom-controls button {
        width: 2rem;
        height: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 0.25rem;
        color: #fff;
        background: transparent;
      }

      .zoom-controls button:disabled {
        opacity: 0.4;
      }

      .preview-unavailable {
        text-align: center;
        padding: 2rem;
      }

      .preview-icon {
        font-size: 3rem;
        color: var(--bs-secondary-color);
      }

      .modal-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .header-actions {
        margin-left: auto;
      }
    `,
  ],
})
export class FileViewerModalComponent {
  @Input() url!: string;
  @Input() fileName = "Attachment";
  @Input() items: FileViewerItem[] = [];
  @Input() initialIndex = 0;
  @Input() enableNavigation = false;
  @Input() resolveById?: (id: string | number) => Promise<{ url: string; fileName?: string } | null>;

  safeUrl: SafeResourceUrl | null = null;
  safeOfficeUrl: SafeResourceUrl | null = null;
  zoomLevel = 1;
  imageLoadError = false;
  currentIndex = 0;
  resolvingItem = false;

  constructor(public activeModal: NgbActiveModal, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.currentIndex = Math.max(0, this.initialIndex || 0);
    this.applyCurrentItem();
  }

  showNavigation(): boolean {
    return this.enableNavigation && Array.isArray(this.items) && this.items.length > 0;
  }

  canPrevious(): boolean {
    return this.currentIndex > 0;
  }

  canNext(): boolean {
    return this.currentIndex < this.items.length - 1;
  }

  async previousItem(): Promise<void> {
    if (!this.showNavigation() || !this.canPrevious() || this.resolvingItem) {
      return;
    }

    this.currentIndex -= 1;
    await this.applyCurrentItem();
  }

  async nextItem(): Promise<void> {
    if (!this.showNavigation() || !this.canNext() || this.resolvingItem) {
      return;
    }

    this.currentIndex += 1;
    await this.applyCurrentItem();
  }

  private async applyCurrentItem(): Promise<void> {
    this.imageLoadError = false;
    this.safeUrl = null;
    this.safeOfficeUrl = null;
    this.zoomLevel = 1;

    if (!Array.isArray(this.items) || this.items.length === 0) {
      this.refreshPreviewUrls();
      return;
    }

    const item = this.items[this.currentIndex];
    if (!item) {
      this.refreshPreviewUrls();
      return;
    }

    if (!item.url && item.id !== undefined && this.resolveById) {
      this.resolvingItem = true;
      try {
        const resolved = await this.resolveById(item.id);
        if (resolved?.url) {
          item.url = resolved.url;
          if (resolved.fileName) {
            item.fileName = resolved.fileName;
          }
        }
      } finally {
        this.resolvingItem = false;
      }
    }

    this.url = item.url || this.url;
    this.fileName = item.fileName || this.fileName;
    this.refreshPreviewUrls();
  }

  private refreshPreviewUrls(): void {
    if (this.isPdf()) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
    }

    if (this.isOfficeDocument()) {
      const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(this.url)}`;
      this.safeOfficeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(officeEmbedUrl);
    }
  }

  onImageError(): void {
    this.imageLoadError = true;
  }

  onImageLoad(): void {
    this.imageLoadError = false;
  }

  isImage(): boolean {
    const url = this.getNormalizedUrl();
    if (url.startsWith('data:image/')) {
      return true;
    }

    if (this.hasExtension([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"])) {
      return true;
    }

    // If type hints are missing (common for checklist image labels), prefer image preview.
    return !this.hasExtension([
      ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".msg", ".eml", ".zip", ".rar", ".7z", ".mp4", ".webm", ".mov", ".avi", ".mkv"
    ]);
  }

  isPdf(): boolean {
    const url = this.getNormalizedUrl();
    return url.startsWith('data:application/pdf') || this.hasExtension([".pdf"]);
  }

  isOfficeDocument(): boolean {
    return this.hasExtension([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);
  }

  isVideo(): boolean {
    const url = this.getNormalizedUrl();
    return url.startsWith('data:video/') || this.hasExtension([".mp4", ".webm", ".mov", ".avi", ".mkv"]);
  }

  private getNormalizedUrl(): string {
    return String(this.url || '').toLowerCase().trim();
  }

  private getHints(): string[] {
    const fileHint = String(this.fileName || '').toLowerCase().trim();
    const urlHint = this.getNormalizedUrl().split('?')[0].split('#')[0];
    return [fileHint, urlHint];
  }

  private hasExtension(extensions: string[]): boolean {
    const hints = this.getHints();
    return hints.some((hint) => extensions.some((ext) => hint.endsWith(ext)));
  }

  zoomIn(): void {
    if (this.zoomLevel < 3) {
      this.zoomLevel += 0.25;
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.25;
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }
}