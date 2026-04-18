import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

export interface RmaActionsCellRendererParams extends ICellRendererParams {
  onEdit: (data: any) => void;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1 h-100">
      <button
        class="btn btn-sm btn-outline-primary"
        title="Select RMA"
        (click)="onEditClick($event)">
        SELECT
      </button>
    </div>
  `
})
export class RmaActionsCellRendererComponent implements ICellRendererAngularComp {
  private params!: RmaActionsCellRendererParams;

  agInit(params: RmaActionsCellRendererParams): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.params.onEdit(this.params.data);
  }
}
