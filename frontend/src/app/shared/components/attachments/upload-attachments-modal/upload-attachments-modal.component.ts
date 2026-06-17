import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";

@Component({
  selector: "app-upload-attachments-modal",
  standalone: true,
  imports: [CommonModule, UploadNewAttachmentsComponent],
  template: `
    <ng-template #uploadModal>
      <div class="modal-header">
        <h5 class="modal-title">{{ modalTitle }}</h5>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          [disabled]="disabled || isUploading"
          (click)="closeModal()"></button>
      </div>

      <div class="modal-body">
        <div *ngIf="isUploading" class="alert alert-info py-2 d-flex align-items-center mb-3" role="status">
          <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          <span>{{ uploadInProgressText }}</span>
        </div>

        <app-upload-new-attachments
          [files]="files"
          [disabled]="disabled || isUploading"
          [accept]="accept"
          [multiple]="multiple"
          [allowPaste]="allowPaste"
          [openPickerOnContainerClick]="openPickerOnContainerClick"
          [chooseLabel]="chooseLabel"
          [dropLabel]="dropLabel"
          [pasteHint]="pasteHint"
          [showPasteHint]="showPasteHint"
          [uploadTriggerMode]="uploadTriggerMode"
          [manualFlowText]="manualFlowText"
          [autoFlowText]="autoFlowText"
          [parentSubmitFlowText]="parentSubmitFlowText"
          (filesAdded)="filesAdded.emit($event)"
          (removeRequested)="removeRequested.emit($event)"
          (uploadRequested)="uploadRequested.emit()">
        </app-upload-new-attachments>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-light" [disabled]="disabled || isUploading" (click)="closeModal()">
          Cancel
        </button>
        <button
          *ngIf="uploadTriggerMode === 'manual'"
          type="button"
          class="btn btn-primary"
          [disabled]="disabled || isUploading || files.length === 0"
          (click)="uploadRequested.emit()">
          <span *ngIf="isUploading" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          <i *ngIf="!isUploading" class="mdi mdi-upload me-1"></i>{{ isUploading ? 'Uploading...' : 'Upload' }}
        </button>
        <button
          *ngIf="uploadTriggerMode === 'parent-submit'"
          type="button"
          class="btn btn-primary"
          [disabled]="disabled || isUploading"
          (click)="closeModal()">
          <i class="mdi mdi-check me-1"></i>Done Adding Files
        </button>
      </div>
    </ng-template>
  `,
})
export class UploadAttachmentsModalComponent {
  @ViewChild("uploadModal") uploadModal: TemplateRef<unknown> | null = null;
  private modalRef: NgbModalRef | null = null;

  @Input() modalTitle = "Upload New Attachments";
  @Input() files: File[] = [];
  @Input() disabled = false;
  @Input() isUploading = false;
  @Input() uploadInProgressText = "Uploading attachments...";

  @Input() accept = "*/*";
  @Input() multiple = true;
  @Input() allowPaste = true;
  @Input() openPickerOnContainerClick = false;
  @Input() chooseLabel = "Choose files";
  @Input() dropLabel = "or drag them here.";
  @Input() pasteHint = "Copy and paste one or more files into this area.";
  @Input() showPasteHint = true;

  @Input() uploadTriggerMode: "manual" | "on-add" | "parent-submit" = "manual";
  @Input() manualFlowText = "Files upload when you click Upload.";
  @Input() autoFlowText = "Files upload automatically after you add them.";
  @Input() parentSubmitFlowText = "Files are queued here and upload when you submit the form.";

  @Output() filesAdded = new EventEmitter<File[]>();
  @Output() removeRequested = new EventEmitter<number>();
  @Output() uploadRequested = new EventEmitter<void>();
  @Output() modalClosed = new EventEmitter<void>();

  constructor(private modalService: NgbModal) {}

  openModal(): void {
    if (!this.uploadModal) return;

    this.modalRef = this.modalService.open(this.uploadModal, {
      size: "lg",
      centered: true,
      backdrop: "static",
      keyboard: true,
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
    this.modalClosed.emit();
  }
}
