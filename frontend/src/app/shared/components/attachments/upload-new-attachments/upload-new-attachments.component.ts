import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { InlineAttachmentDropzoneComponent } from "@app/shared/components/attachments/inline-attachment-dropzone/inline-attachment-dropzone.component";
import { PendingUploadsListComponent } from "@app/shared/components/attachments/pending-uploads-list/pending-uploads-list.component";

@Component({
  selector: "app-upload-new-attachments",
  standalone: true,
  imports: [CommonModule, InlineAttachmentDropzoneComponent, PendingUploadsListComponent],
  template: `
    <div class="mb-3">
      <app-inline-attachment-dropzone
        [disabled]="disabled"
        [accept]="accept"
        [multiple]="multiple"
        [allowPaste]="allowPaste"
        [openPickerOnContainerClick]="openPickerOnContainerClick"
        [chooseLabel]="chooseLabel"
        [dropLabel]="dropLabel"
        [pasteHint]="pasteHint"
        [showPasteHint]="showPasteHint"
        (filesAdded)="onFilesAdded($event)">
      </app-inline-attachment-dropzone>
      <div class="form-text">{{ resolvedFlowText }}</div>
    </div>

    <div class="mt-3" *ngIf="files.length > 0">
      <app-pending-uploads-list
        [viewMode]="pendingViewMode"
        [files]="files"
        [disabled]="disabled"
        (removeRequested)="removeRequested.emit($event)">
      </app-pending-uploads-list>
    </div>
  `,
})
export class UploadNewAttachmentsComponent {
  @Input() files: File[] = [];
  @Input() disabled = false;

  @Input() accept = "*/*";
  @Input() multiple = true;
  @Input() allowPaste = true;
  @Input() openPickerOnContainerClick = false;
  @Input() chooseLabel = "Choose files";
  @Input() dropLabel = "or drag them here.";
  @Input() pasteHint = "Copy and paste one or more files into this area.";
  @Input() showPasteHint = true;
  @Input() helperText = "";
  @Input() pendingViewMode: "list" | "table" = "list";

  @Input() uploadTriggerMode: "manual" | "on-add" | "parent-submit" = "manual";
  @Input() manualFlowText = "Files upload when you click Upload.";
  @Input() autoFlowText = "Files upload automatically after you add them.";
  @Input() parentSubmitFlowText = "Files are queued here and upload when you submit the form.";

  @Output() filesAdded = new EventEmitter<File[]>();
  @Output() removeRequested = new EventEmitter<number>();
  @Output() uploadRequested = new EventEmitter<void>();

  get resolvedFlowText(): string {
    if (this.helperText?.trim()) {
      return this.helperText;
    }

    if (this.uploadTriggerMode === "on-add") {
      return this.autoFlowText;
    }

    if (this.uploadTriggerMode === "parent-submit") {
      return this.parentSubmitFlowText;
    }

    return this.manualFlowText;
  }

  onFilesAdded(files: File[]): void {
    this.filesAdded.emit(files);

    if (this.uploadTriggerMode === "on-add") {
      this.uploadRequested.emit();
    }
  }
}
