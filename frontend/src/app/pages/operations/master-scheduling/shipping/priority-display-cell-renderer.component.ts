import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-priority-display-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="priorityPosition > 0">
      {{ priorityPosition }}
    </ng-container>
    <ng-container *ngIf="priorityPosition === 0">
      <span class="text-muted">-</span>
    </ng-container>
  `,
  styles: [`
    .priority-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 12px;
      letter-spacing: 0.5px;
    }
  `]
})
export class PriorityDisplayCellRendererComponent implements ICellRendererAngularComp {
  priorityPosition = 0;

  agInit(params: ICellRendererParams): void {
    this.priorityPosition = params.data?.shipping_priority || 0;
  }

  refresh(params: ICellRendererParams): boolean {
    this.priorityPosition = params.data?.shipping_priority || 0;
    return true;
  }

  getBadgeClass(): string {
    if (this.priorityPosition === 1) {
      return 'bg-danger text-white';
    } else if (this.priorityPosition === 2) {
      return 'bg-warning text-dark';
    } else if (this.priorityPosition === 3) {
      return 'bg-info text-white';
    }
    return 'bg-warning text-dark';
  }

  getIconClass(): string {
    if (this.priorityPosition === 1) {
      return 'mdi-trophy';
    } else if (this.priorityPosition === 2) {
      return 'mdi-medal';
    } else if (this.priorityPosition === 3) {
      return 'mdi-star-circle';
    }
    return 'mdi-star';
  }
}
