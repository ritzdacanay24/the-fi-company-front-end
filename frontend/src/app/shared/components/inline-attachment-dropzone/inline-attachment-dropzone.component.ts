import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

@Component({
  selector: 'app-inline-attachment-dropzone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="inline-attachment-dropzone rounded p-4 text-center"
      [class.inline-attachment-dropzone-active]="isDropzoneActive()"
      [class.inline-attachment-dropzone-disabled]="disabled"
      (click)="onDropzoneClick(fileInput)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (paste)="onPaste($event)">
      <div class="mb-2 text-body-secondary">
        <i class="mdi mdi-cloud-upload-outline" style="font-size: 2rem;"></i>
      </div>

      <p class="mb-1">
        <button
          type="button"
          class="btn btn-link p-0 align-baseline link-primary text-decoration-underline"
          (click)="onChooseClick($event, fileInput)"
          [disabled]="disabled">
          {{ chooseLabel }}
        </button>
        <span class="text-body-secondary"> {{ dropLabel }}</span>
      </p>

      @if (showPasteHint) {
        <p class="mb-0 text-body-secondary">{{ pasteHint }}</p>
      }

      <input
        #fileInput
        type="file"
        [attr.accept]="accept"
        [multiple]="multiple"
        class="d-none"
        (change)="onFileInputChange($event)">
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .inline-attachment-dropzone {
        border: 2px dashed #94a3b8;
        background-color: rgba(148, 163, 184, 0.08);
        transition: border-color 0.2s ease, background-color 0.2s ease;
      }

      .inline-attachment-dropzone-active {
        border-color: var(--bs-primary);
        background-color: var(--bs-primary-bg-subtle);
      }

      .inline-attachment-dropzone-disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      :host-context([data-bs-theme='dark']) .inline-attachment-dropzone {
        border-color: #64748b;
        background-color: rgba(148, 163, 184, 0.12);
      }
    `,
  ],
})
export class InlineAttachmentDropzoneComponent {
  @Input() accept = '*/*';
  @Input() multiple = true;
  @Input() disabled = false;
  @Input() allowPaste = true;
  @Input() openPickerOnContainerClick = false;

  @Input() chooseLabel = 'Choose a file';
  @Input() dropLabel = 'or drag it here.';
  @Input() pasteHint = 'Copy and paste clipboard files here.';
  @Input() showPasteHint = true;

  @Output() filesAdded = new EventEmitter<File[]>();

  isDropzoneActive = signal(false);

  onChooseClick(event: MouseEvent, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled) {
      return;
    }

    input.click();
  }

  onDropzoneClick(input: HTMLInputElement): void {
    if (!this.openPickerOnContainerClick || this.disabled) {
      return;
    }

    input.click();
  }

  onFileInputChange(event: Event): void {
    if (this.disabled) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';

    if (files.length > 0) {
      this.filesAdded.emit(files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled) {
      return;
    }

    this.isDropzoneActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDropzoneActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDropzoneActive.set(false);

    if (this.disabled) {
      return;
    }

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.filesAdded.emit(files);
    }
  }

  onPaste(event: ClipboardEvent): void {
    if (!this.allowPaste || this.disabled) {
      return;
    }

    const files = this.normalizeClipboardFileNames(this.extractFilesFromClipboard(event.clipboardData));
    if (!files.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.filesAdded.emit(files);
  }

  private extractFilesFromClipboard(clipboardData: DataTransfer | null): File[] {
    if (!clipboardData) {
      return [];
    }

    const directFiles = Array.from(clipboardData.files || []);
    if (directFiles.length) {
      return directFiles;
    }

    return Array.from(clipboardData.items || [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
  }

  private normalizeClipboardFileNames(files: File[]): File[] {
    if (!files.length) {
      return files;
    }

    const timestamp = this.formatTimestampForFileName(new Date());

    return files.map((file, index) => {
      if (!this.isGenericClipboardName(file.name)) {
        return file;
      }

      const extension = this.getFileExtension(file.name, file.type);
      const friendlyName = `pasted-${timestamp}-${index + 1}.${extension}`;

      return new File([file], friendlyName, {
        type: file.type,
        lastModified: file.lastModified,
      });
    });
  }

  private isGenericClipboardName(fileName: string): boolean {
    const normalized = String(fileName || '').trim().toLowerCase();

    if (!normalized) {
      return true;
    }

    return /^(image|clipboard|screenshot)(\s*\(\d+\))?\.(png|jpe?g|gif|webp|bmp)$/i.test(normalized);
  }

  private getFileExtension(fileName: string, mimeType: string): string {
    const fromName = String(fileName || '').trim().toLowerCase();
    const extMatch = fromName.match(/\.([a-z0-9]+)$/i);
    if (extMatch?.[1]) {
      return extMatch[1];
    }

    const fromMime = String(mimeType || '').trim().toLowerCase();
    if (fromMime.includes('png')) return 'png';
    if (fromMime.includes('jpeg') || fromMime.includes('jpg')) return 'jpg';
    if (fromMime.includes('gif')) return 'gif';
    if (fromMime.includes('webp')) return 'webp';
    if (fromMime.includes('bmp')) return 'bmp';

    return 'bin';
  }

  private formatTimestampForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hour}${minute}${second}`;
  }
}
