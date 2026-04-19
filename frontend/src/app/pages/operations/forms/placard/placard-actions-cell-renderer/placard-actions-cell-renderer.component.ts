import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  standalone: true,
  selector: 'app-placard-actions-cell-renderer',
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1 h-100">
      <button class="btn btn-sm btn-outline-primary" (click)="onEdit()" title="View Placard">
        SELECT
      </button>
    </div>
  `,
})
export class PlacardActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams & {
    onEdit: (id: any) => void;
  };

  agInit(params: ICellRendererParams & {
    onEdit: (id: any) => void;
  }): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onEdit() {
    if (this.params.onEdit) {
      this.params.onEdit(this.params.data.id);
    }
  }
}