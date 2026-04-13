import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

export interface SafetyIncidentActionsCellRendererParams extends ICellRendererParams {
  onView: (data: any) => void;
  onEdit: (data: any) => void;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1">
      <button 
        class="btn btn-sm btn-outline-info" 
        title="View Safety Incident"
        (click)="onViewClick($event)">
        <i class="mdi mdi-eye"></i>
      </button>
      <button 
        class="btn btn-sm btn-outline-primary" 
        title="Edit Safety Incident"
        (click)="onEditClick($event)">
        <i class="mdi mdi-pencil"></i>
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
export class SafetyIncidentActionsCellRendererComponent implements ICellRendererAngularComp {
  private params!: SafetyIncidentActionsCellRendererParams;

  agInit(params: SafetyIncidentActionsCellRendererParams): void {
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
    this.params.onEdit(this.params.data);
  }
}