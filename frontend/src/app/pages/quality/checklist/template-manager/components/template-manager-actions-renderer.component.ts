import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

export interface TemplateManagerActionsCellParams extends ICellRendererParams<ChecklistTemplate> {
  onEdit: (template: ChecklistTemplate) => void;
}

@Component({
  selector: 'app-template-manager-actions-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="params?.data">
      <button
        class="btn btn-sm btn-primary"
        type="button"
        title="Open template editor"
        (click)="onView()">
        <i class="mdi mdi-eye me-1"></i>
        View
      </button>
    </ng-container>
  `,
  styles: [`
    .tm-actions {
      width: 100%;
      justify-content: center;
    }

    .tm-actions-primary {
      width: 120px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class TemplateManagerActionsRendererComponent implements ICellRendererAngularComp {
  params!: TemplateManagerActionsCellParams;

  agInit(params: TemplateManagerActionsCellParams): void {
    this.params = params;
  }

  refresh(params: TemplateManagerActionsCellParams): boolean {
    this.params = params;
    return true;
  }

  onView(): void {
    if (!this.params?.data) {
      return;
    }

    this.params.onEdit(this.params.data);
  }
}
