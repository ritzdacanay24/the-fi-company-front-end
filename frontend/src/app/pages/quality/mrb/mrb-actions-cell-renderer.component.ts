import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

export interface MrbActionsCellRendererParams extends ICellRendererParams {
  onEdit: (data: any) => void;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1 h-100">
      <button
        class="btn btn-sm btn-outline-primary"
        title="View MRB"
        (click)="onEditClick($event)">
        SELECT
      </button>
    </div>
  `,
  styles: [`
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
  `]
})
export class MrbActionsCellRendererComponent implements ICellRendererAngularComp {
  private params!: MrbActionsCellRendererParams;

  agInit(params: MrbActionsCellRendererParams): void {
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
