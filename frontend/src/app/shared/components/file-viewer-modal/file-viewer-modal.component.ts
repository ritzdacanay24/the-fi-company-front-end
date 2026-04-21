import { CommonModule } from "@angular/common";
import { SafeResourceUrl, DomSanitizer } from "@angular/platform-browser";
import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-file-viewer-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title d-flex align-items-center gap-2">
        <i class="mdi mdi-file-eye"></i>
        <span [title]="fileName">{{ fileName || "Attachment" }}</span>
      </h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>

    <div class="modal-body p-0">
      <div class="viewer-container">
        @if (isImage() && !imageLoadError) {
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
    `,
  ],
})
export class FileViewerModalComponent {
  @Input() url!: string;
  @Input() fileName = "Attachment";

  safeUrl: SafeResourceUrl | null = null;
  safeOfficeUrl: SafeResourceUrl | null = null;
  zoomLevel = 1;
  imageLoadError = false;

  constructor(public activeModal: NgbActiveModal, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.imageLoadError = false;
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
    const file = (this.fileName || "").toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"].some((ext) => file.endsWith(ext));
  }

  isPdf(): boolean {
    return (this.fileName || "").toLowerCase().endsWith(".pdf");
  }

  isOfficeDocument(): boolean {
    const file = (this.fileName || "").toLowerCase();
    return [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].some((ext) => file.endsWith(ext));
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