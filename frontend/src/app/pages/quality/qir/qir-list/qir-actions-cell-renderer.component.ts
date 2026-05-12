import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

export interface QirActionsCellRendererParams extends ICellRendererParams {
  onView: (data: any) => void;
  onEdit: (data: any) => void;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1 h-100">
      <button
        class="btn btn-sm btn-outline-primary"
        title="Select QIR"
        (click)="onEditClick($event)">
        SELECT
      </button>
    </div>
  `
})
export class QirActionsCellRendererComponent implements ICellRendererAngularComp {
  private params!: QirActionsCellRendererParams;
  
  get isQirClosed(): boolean {
    const status = this.params?.data?.status?.toLowerCase();
    const openStatuses = ['open', 'in process', 'awaiting verification', 'closed'];
    return !openStatuses.includes(status);
  }

  agInit(params: QirActionsCellRendererParams): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onViewClick(event: Event): void {
    event.stopPropagation();
    this.params.onView(this.params.data);
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    if (!this.isQirClosed) {
      this.params.onEdit(this.params.data);
    }
  }
}
