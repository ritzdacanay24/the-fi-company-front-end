import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { PmAttachmentType, PmTaskAttachment, PmTaskRecord } from './services/project-manager-tasks-data.service';

@Component({
  standalone: true,
  selector: 'app-pm-task-attachment-modal',
  imports: [SharedModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <div>
        <h5 class="modal-title mb-0">Attachments</h5>
        <small class="text-muted">{{ task.taskName }}</small>
      </div>
      <button type="button" class="btn-close" (click)="close()"></button>
    </div>

    <div class="modal-body p-0">

      <!-- Attachment list -->
      <div class="px-3 pt-3" style="max-height: 340px; overflow-y: auto;">
        <div *ngIf="!attachments.length" class="text-muted small py-3 text-center">
          No attachments yet.
        </div>

        <div *ngFor="let a of attachments" class="attachment-row d-flex align-items-center gap-2 mb-2 p-2 border rounded">
          <!-- Preview / icon -->
          <div class="attach-thumb flex-shrink-0">
            <img *ngIf="a.dataUrl && isImage(a.name)" [src]="a.dataUrl" [alt]="a.name"
                 class="rounded" style="width:44px;height:44px;object-fit:cover;" />
            <div *ngIf="!a.dataUrl || !isImage(a.name)" class="file-icon">
              {{ fileIcon(a.type) }}
            </div>
          </div>

          <!-- Info -->
          <div class="flex-grow-1 overflow-hidden">
            <div class="fw-semibold small text-truncate">{{ a.name }}</div>
            <div class="text-muted" style="font-size:11px;">
              {{ a.type }} · {{ a.sizeLabel }} · {{ formatDate(a.uploadedAt) }} by {{ a.uploadedBy }}
            </div>
          </div>

          <!-- Remove -->
          <button class="btn btn-sm btn-outline-danger py-0 px-1" style="font-size:11px;" (click)="remove(a.id)" title="Remove">✕</button>
        </div>
      </div>

      <!-- Upload area -->
      <div class="border-top px-3 py-3">
        <div class="drop-zone border border-dashed rounded p-3 text-center mb-3"
             (dragover)="$event.preventDefault()"
             (drop)="onDrop($event)">
          <div class="text-muted small mb-2">Drag & drop files here, or</div>
          <label class="btn btn-sm btn-outline-primary mb-0">
            Browse
            <input type="file" multiple class="d-none" (change)="onFileSelect($event)" />
          </label>
        </div>

        <div class="row g-2">
          <div class="col-6">
            <label class="form-label form-label-sm mb-1">Type</label>
            <select class="form-select form-select-sm" [formControl]="typeControl">
              <option *ngFor="let t of attachmentTypes" [value]="t">{{ t }}</option>
            </select>
          </div>
          <div class="col-6">
            <label class="form-label form-label-sm mb-1">Uploaded by</label>
            <input type="text" class="form-control form-control-sm" [formControl]="uploaderControl" placeholder="Your name" />
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer py-2">
      <span class="text-muted small me-auto">{{ attachments.length }} file{{ attachments.length !== 1 ? 's' : '' }}</span>
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="close()">Close</button>
    </div>
  `,
  styles: [`
    .drop-zone {
      cursor: pointer;
      transition: background 0.15s;
      border-style: dashed !important;
    }
    .drop-zone:hover { background: #f0f4ff; }
    .file-icon {
      width: 44px; height: 44px;
      display: flex; align-items: center; justify-content: center;
      background: #e9ecef; border-radius: 6px;
      font-size: 20px;
    }
  `]
})
export class PmTaskAttachmentModalComponent implements OnInit {
  @Input() task!: PmTaskRecord;
  @Input() initialAttachments: PmTaskAttachment[] = [];
  @Input() defaultUploader = '';

  attachments: PmTaskAttachment[] = [];
  private nextId = 1;

  readonly attachmentTypes: PmAttachmentType[] = ['Email', 'Picture', 'Document', 'Other'];

  typeControl = new FormControl<PmAttachmentType>('Document');
  uploaderControl = new FormControl('', [Validators.required, Validators.maxLength(80)]);

  constructor(private activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.attachments = [...this.initialAttachments];
    this.nextId = this.attachments.length
      ? Math.max(...this.attachments.map(a => a.id)) + 1
      : 1;
    this.uploaderControl.setValue(this.defaultUploader);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
  }

  private processFiles(files: File[]): void {
    const uploader = (this.uploaderControl.value || '').trim();
    const type = (this.typeControl.value || 'Document') as PmAttachmentType;

    files.forEach(file => {
      const sizeLabel = this.formatSize(file.size);
      const id = this.nextId++;

      const attachment: PmTaskAttachment = {
        id,
        taskId: this.task.id,
        name: file.name,
        type,
        sizeLabel,
        uploadedBy: uploader || 'Unknown',
        uploadedAt: new Date().toISOString()
      };

      if (this.isImage(file.name)) {
        const reader = new FileReader();
        reader.onload = e => {
          attachment.dataUrl = e.target?.result as string;
          this.attachments = [...this.attachments];
        };
        reader.readAsDataURL(file);
      }

      this.attachments = [...this.attachments, attachment];
    });
  }

  remove(id: number): void {
    this.attachments = this.attachments.filter(a => a.id !== id);
  }

  close(): void {
    this.activeModal.close(this.attachments);
  }

  isImage(name: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
  }

  fileIcon(type: PmAttachmentType): string {
    const icons: Record<PmAttachmentType, string> = {
      Email: '📧',
      Picture: '🖼️',
      Document: '📄',
      Other: '📎'
    };
    return icons[type] ?? '📎';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }
}
