import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InlineAttachmentDropzoneComponent } from '@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component';
import { PendingAttachmentsListComponent } from '@app/shared/components/attachments/pending-attachments-list/pending-attachments-list.component';

@Component({
  standalone: true,
  selector: 'app-attachment-upload-modal',
  imports: [CommonModule, InlineAttachmentDropzoneComponent, PendingAttachmentsListComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ title }}</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss('cancel')"></button>
    </div>

    <div class="modal-body">
      <p class="text-muted mb-3">{{ description }}</p>

      <app-inline-attachment-dropzone
        [disabled]="disabled"
        (filesAdded)="onAttachmentFilesAdded($event)">
      </app-inline-attachment-dropzone>

      <div class="mt-3">
        <app-pending-attachments-list
          [files]="selectedFiles"
          [disabled]="disabled"
          [helperText]="helperText"
          (removeRequested)="removeFile($event)">
        </app-pending-attachments-list>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss('cancel')">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="disabled" (click)="apply()">Apply</button>
    </div>
  `,
})
export class AttachmentUploadModalComponent implements OnInit {
  @Input() title = 'Upload Attachments';
  @Input() description = 'Add files to the upload queue.';
  @Input() helperText = 'Selected files will be uploaded when you submit the form.';
  @Input() disabled = false;
  @Input() initialFiles: File[] = [];

  selectedFiles: File[] = [];

  constructor(public readonly activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.selectedFiles = [...(this.initialFiles || [])];
  }

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files || []);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
  }

  apply(): void {
    this.activeModal.close([...this.selectedFiles]);
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const dedupedFiles = new Map(this.selectedFiles.map((file) => [this.getFileKey(file), file]));

    files.forEach((file) => {
      dedupedFiles.set(this.getFileKey(file), file);
    });

    this.selectedFiles = Array.from(dedupedFiles.values());
  }

  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
