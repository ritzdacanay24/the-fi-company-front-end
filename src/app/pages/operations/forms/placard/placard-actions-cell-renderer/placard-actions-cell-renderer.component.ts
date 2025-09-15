import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  standalone: true,
  selector: 'app-placard-actions-cell-renderer',
  template: `
    <div class="d-flex gap-1">
      <button class="btn btn-sm btn-outline-primary" (click)="onView()" title="View Summary">
        <i class="mdi mdi-eye"></i>
      </button>
      <button class="btn btn-sm btn-outline-secondary" (click)="onEdit()" title="Edit Placard">
        <i class="mdi mdi-pencil"></i>
      </button>
    </div>
  `,
  styles: [`
    button {
      border: 1px solid;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
  `]
})
export class PlacardActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams & {
    onView: (id: any) => void;
    onEdit: (id: any) => void;
  };

  agInit(params: ICellRendererParams & {
    onView: (id: any) => void;
    onEdit: (id: any) => void;
  }): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onView() {
    if (this.params.onView) {
      this.params.onView(this.params.data.id);
    }
  }

  onEdit() {
    if (this.params.onEdit) {
      this.params.onEdit(this.params.data.id);
    }
  }
}