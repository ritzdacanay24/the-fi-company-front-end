import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { UploadedAttachmentsListComponent } from '@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component';

interface PendingAttachmentRow {
  id: string;
  file_name: string;
  file_url: string;
  fileSize: number;
  createdDate: Date;
  createdByName: string;
}

@Component({
  selector: 'app-pending-attachments-list',
  standalone: true,
  imports: [CommonModule, UploadedAttachmentsListComponent],
  template: `
    <div *ngIf="files?.length">
      <app-uploaded-attachments-list
        [attachments]="rows"
        [showDelete]="!disabled"
        [disableDelete]="disabled"
        [deleteTitle]="'Remove file from upload queue'"
        [showHelperText]="true"
        [helperText]="helperText"
        [resolveById]="resolveLocalUrl"
        (deleteRequested)="onDeleteRequested($event)">
      </app-uploaded-attachments-list>
    </div>
  `,
})
export class PendingAttachmentsListComponent implements OnChanges, OnDestroy {
  @Input() files: File[] = [];
  @Input() disabled = false;
  @Input() helperText = 'Files are queued and will upload after saving.';

  @Output() removeRequested = new EventEmitter<number>();

  rows: PendingAttachmentRow[] = [];

  private readonly objectUrlByKey = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['files']) {
      this.syncRowsFromFiles();
    }
  }

  ngOnDestroy(): void {
    this.revokeAllUrls();
  }

  onDeleteRequested(event: { index: number }): void {
    if (this.disabled) {
      return;
    }

    if (!Number.isInteger(event?.index) || event.index < 0) {
      return;
    }

    this.removeRequested.emit(event.index);
  }

  resolveLocalUrl = async (id: string | number): Promise<{ url: string; fileName?: string } | null> => {
    const row = this.rows.find((item) => item.id === String(id));
    if (!row?.file_url) {
      return null;
    }

    return {
      url: row.file_url,
      fileName: row.file_name,
    };
  };

  private syncRowsFromFiles(): void {
    const nextKeys = new Set(this.files.map((file) => this.getFileKey(file)));

    for (const [key, url] of this.objectUrlByKey.entries()) {
      if (!nextKeys.has(key)) {
        URL.revokeObjectURL(url);
        this.objectUrlByKey.delete(key);
      }
    }

    this.rows = this.files.map((file) => {
      const key = this.getFileKey(file);
      const existingUrl = this.objectUrlByKey.get(key);
      const fileUrl = existingUrl || URL.createObjectURL(file);

      if (!existingUrl) {
        this.objectUrlByKey.set(key, fileUrl);
      }

      return {
        id: key,
        file_name: file.name,
        file_url: fileUrl,
        fileSize: file.size,
        createdDate: new Date(file.lastModified || Date.now()),
        createdByName: 'Pending upload',
      };
    });
  }

  private revokeAllUrls(): void {
    for (const url of this.objectUrlByKey.values()) {
      URL.revokeObjectURL(url);
    }

    this.objectUrlByKey.clear();
  }

  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
