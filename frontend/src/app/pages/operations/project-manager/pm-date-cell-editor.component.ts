import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';

@Component({
  standalone: true,
  selector: 'app-pm-date-cell-editor',
  imports: [FormsModule],
  template: `
    <input
      #dateInput
      type="date"
      class="ag-input-field-input ag-text-field-input"
      [(ngModel)]="value"
      style="width:100%;height:100%;border:0;outline:0;background:transparent;padding:0;"
    />
  `,
})
export class PmDateCellEditorComponent implements ICellEditorAngularComp {
  @ViewChild('dateInput', { static: true })
  private dateInput!: ElementRef<HTMLInputElement>;

  value = '';

  agInit(params: ICellEditorParams): void {
    this.value = this.normalizeDateInput(params.value);
  }

  getValue(): string {
    return this.normalizeDateInput(this.value);
  }

  afterGuiAttached(): void {
    const input = this.dateInput.nativeElement;
    input.focus();
    input.select();

    const anyInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof anyInput.showPicker === 'function') {
      anyInput.showPicker();
    }
  }

  private normalizeDateInput(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
