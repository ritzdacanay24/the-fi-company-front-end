import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

interface OpenActionRendererParams extends ICellRendererParams {
  onOpen?: (row: any) => void;
}

@Component({
  standalone: true,
  selector: 'app-shipping-checklist-history-open-action-renderer',
  imports: [CommonModule],
  template: `
    <button class="btn btn-sm btn-outline-primary action-btn" type="button" (click)="open()">
      Open
    </button>
  `,
})
export class ShippingChecklistHistoryOpenActionRendererComponent implements ICellRendererAngularComp {
  private params!: OpenActionRendererParams;

  agInit(params: OpenActionRendererParams): void {
    this.params = params;
  }

  refresh(params: OpenActionRendererParams): boolean {
    this.params = params;
    return true;
  }

  open(): void {
    const row = this.params?.data;
    if (!row?.id || typeof this.params?.onOpen !== 'function') {
      return;
    }

    this.params.onOpen(row);
  }
}
