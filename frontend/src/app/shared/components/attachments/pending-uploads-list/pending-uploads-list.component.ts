import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";

@Component({
  selector: "app-pending-uploads-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0 text-muted">Pending Uploads</h6>
      <small class="text-muted">{{ files.length }} file(s), {{ getTotalFileSize() }} MB total</small>
    </div>

    <div class="list-group" *ngIf="viewMode === 'list'">
      <div class="list-group-item d-flex justify-content-between align-items-center" *ngFor="let file of files; let i = index">
        <div class="d-flex align-items-center">
          <i class="mdi mdi-file me-2 text-muted"></i>
          <div>
            <div class="fw-medium">{{ file.name }}</div>
            <small class="text-muted">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</small>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-sm btn-outline-primary" (click)="previewFile(file)" title="View pending file">
            <i class="mdi mdi-eye"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="disabled" (click)="onRemove(i)" title="Remove file">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="table-responsive border rounded" *ngIf="viewMode === 'table'">
      <table class="table table-sm align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th scope="col">File Name</th>
            <th scope="col" style="width: 140px;">Size</th>
            <th scope="col" style="width: 120px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let file of files; let i = index">
            <td style="min-width: 0; max-width: 0;">
              <span class="d-block text-truncate" [title]="file.name">{{ file.name }}</span>
            </td>
            <td>
              <small class="text-muted">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</small>
            </td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="previewFile(file)" title="View pending file">
                  <i class="mdi mdi-eye"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="disabled" (click)="onRemove(i)" title="Remove file">
                  <i class="mdi mdi-close"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class PendingUploadsListComponent {
  @Input() viewMode: "list" | "table" = "list";
  @Input() files: File[] = [];
  @Input() disabled = false;

  @Output() removeRequested = new EventEmitter<number>();

  constructor(private modalService: NgbModal) {}

  onRemove(index: number): void {
    this.removeRequested.emit(index);
  }

  previewFile(file: File): void {
    const objectUrl = URL.createObjectURL(file);
    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: "xl",
      centered: true,
      scrollable: true,
      backdrop: "static",
    });

    modalRef.componentInstance.url = objectUrl;
    modalRef.componentInstance.fileName = file.name;

    modalRef.result.finally(() => {
      URL.revokeObjectURL(objectUrl);
    });
  }

  getTotalFileSize(): string {
    if (!this.files || this.files.length === 0) {
      return "0";
    }

    const totalBytes = this.files.reduce((total, file) => total + file.size, 0);
    return (totalBytes / 1024 / 1024).toFixed(2);
  }
}
