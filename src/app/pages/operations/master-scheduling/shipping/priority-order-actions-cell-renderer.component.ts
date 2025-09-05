import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface PriorityOrderActionsCellRendererParams extends ICellRendererParams {
  onAddToPriority: (orderId: string) => void;
  onRemovePriority: (orderId: string) => void;
}

@Component({
  selector: 'app-priority-order-actions-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center">
      <ng-container *ngIf="!hasPriority && showAddButton">
        <button 
          class="btn btn-sm btn-outline-success priority-toggle-btn"
          [id]="'priority-btn-' + params.data.id"
          (click)="addToPriority()"
          title="Add to Priority List">
          <i class="mdi mdi-star-plus me-1"></i>
          <span class="btn-text">Add Priority</span>
        </button>
      </ng-container>
      
      <ng-container *ngIf="hasPriority">
        <button 
          class="btn btn-sm btn-outline-danger priority-toggle-btn"
          [id]="'priority-btn-' + params.data.id"
          (click)="removePriority()"
          [title]="'Remove from Priority List (Currently Priority ' + params.data.shipping_priority + ')'">
          <i class="mdi mdi-star-off me-1"></i>
          <span class="btn-text">Remove Priority</span>
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    .priority-toggle-btn {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    .priority-toggle-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .priority-toggle-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .btn-text {
      font-size: 10px;
    }
  `]
})
export class PriorityOrderActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: PriorityOrderActionsCellRendererParams;
  hasPriority = false;
  showAddButton = true;

  agInit(params: PriorityOrderActionsCellRendererParams): void {
    this.params = params;
    this.hasPriority = this.params.data?.shipping_priority > 0;
    this.showAddButton = !!this.params.onAddToPriority; // Show add button only if callback is provided
  }

  refresh(params: PriorityOrderActionsCellRendererParams): boolean {
    this.params = params;
    this.hasPriority = this.params.data?.shipping_priority > 0;
    this.showAddButton = !!this.params.onAddToPriority; // Update add button visibility
    return true;
  }

  addToPriority(): void {
    if (this.params.onAddToPriority) {
      this.params.onAddToPriority(this.params.data.id);
    }
  }

  removePriority(): void {
    if (this.params.onRemovePriority) {
      this.params.onRemovePriority(this.params.data.id);
    }
  }
}
