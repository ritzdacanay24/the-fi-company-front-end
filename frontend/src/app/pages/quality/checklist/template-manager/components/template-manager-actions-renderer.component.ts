import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

export interface TemplateManagerActionsCellParams extends ICellRendererParams<ChecklistTemplate> {
  onEdit: (template: ChecklistTemplate) => void;
  onView: (template: ChecklistTemplate) => void;
  isLatest: boolean;
  lockedByOther?: boolean;
  draftOwnerName?: string | null;
}

@Component({
  selector: 'app-template-manager-actions-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="params?.data">
      <!-- Latest version (or draft): full edit button -->
      <button
        *ngIf="params.isLatest"
        class="btn btn-sm"
        [class.btn-primary]="!params.lockedByOther"
        [class.btn-outline-secondary]="params.lockedByOther"
        type="button"
        [title]="params.lockedByOther ? 'Open draft in review mode' : 'Open template editor'"
        (click)="onEdit()">
        <i class="mdi me-1" [class.mdi-pencil]="!params.lockedByOther" [class.mdi-eye]="params.lockedByOther"></i>
        {{ params.lockedByOther ? 'Review' : 'Edit' }}
      </button>
      <!-- Older version: view-only -->
      <button
        *ngIf="!params.isLatest"
        class="btn btn-sm btn-outline-secondary"
        type="button"
        title="View this version (read-only)"
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

  onEdit(): void {
    if (this.params?.data) {
      this.params.onEdit(this.params.data);
    }
  }

  onView(): void {
    if (this.params?.data) {
      this.params.onView(this.params.data);
    }
  }
}
