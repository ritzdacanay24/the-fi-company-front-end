import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface PriorityActionsCellRendererParams extends ICellRendererParams {
  onAddToPriority: (orderData: any) => void;
  onMakeTopPriority: (orderData: any) => void;
  onRemovePriority: (orderId: string) => void;
}

@Component({
  selector: 'app-priority-actions-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1">
      <ng-container *ngIf="!hasPriority">
        <!-- Add to Priority Button -->
        <button 
          class="btn btn-sm btn-outline-success priority-toggle-btn"
          [id]="'priority-btn-' + params.data.id"
          (click)="addToPriority()"
          title="Add to Priority List">
          <i class="mdi mdi-star me-1"></i>
          <span class="btn-text">Add to Priority</span>
        </button>
        
        <!-- Make Top Priority Button -->
        <!-- <button 
          class="btn btn-sm btn-outline-warning priority-toggle-btn"
          (click)="makeTopPriority()"
          title="Make Top Priority">
          <i class="mdi mdi-trophy me-1"></i>
          <span class="btn-text">Make #1</span>
        </button> -->
      </ng-container>
      
      <ng-container *ngIf="hasPriority">
        <!-- Remove Priority Button -->
        <button 
          class="btn btn-sm btn-outline-danger priority-toggle-btn"
          [id]="'priority-btn-' + params.data.id"
          (click)="removePriority()"
          title="Remove from Priority List">
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
export class PriorityActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: PriorityActionsCellRendererParams;
  hasPriority = false;

  agInit(params: PriorityActionsCellRendererParams): void {
    this.params = params;
    this.hasPriority = this.params.data?.shipping_priority > 0;
  }

  refresh(params: PriorityActionsCellRendererParams): boolean {
    this.params = params;
    this.hasPriority = this.params.data?.shipping_priority > 0;
    return true;
  }

  addToPriority(): void {
    if (this.params.onAddToPriority) {
      this.params.onAddToPriority(this.params.data);
    }
  }

  makeTopPriority(): void {
    if (this.params.onMakeTopPriority) {
      this.params.onMakeTopPriority(this.params.data);
    }
  }

  removePriority(): void {
    if (this.params.onRemovePriority) {
      this.params.onRemovePriority(this.params.data.id);
    }
  }
}
