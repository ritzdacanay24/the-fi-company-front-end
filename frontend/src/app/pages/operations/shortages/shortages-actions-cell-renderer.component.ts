import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

export interface ShortagesActionsCellRendererParams extends ICellRendererParams {
  onView: (data: any) => void;
  onComment: (data: any) => void;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1 h-100">
      <button
        class="btn btn-sm btn-outline-primary"
        title="View Shortage"
        (click)="onViewClick($event)">
        <i class="mdi mdi-eye"></i>
      </button>
      <button
        class="btn btn-sm btn-outline-secondary"
        title="Comments"
        (click)="onCommentClick($event)">
        <i class="mdi mdi-comment-outline"></i>
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
export class ShortagesActionsCellRendererComponent implements ICellRendererAngularComp {
  private params!: ShortagesActionsCellRendererParams;

  agInit(params: ShortagesActionsCellRendererParams): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onViewClick(event: Event): void {
    event.stopPropagation();
    this.params.onView(this.params.data);
  }

  onCommentClick(event: Event): void {
    event.stopPropagation();
    this.params.onComment(this.params.data);
  }
}
