import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

interface ChecklistActionsCellRendererParams extends ICellRendererParams {
  mode: 'template' | 'instance';
  onPreview?: (data: any) => void;
  onStart?: (data: any) => void;
  onOpen?: (data: any) => void;
}

@Component({
  selector: 'app-checklist-actions-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checklist-actions-cell-renderer.component.html'
})
export class ChecklistActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: ChecklistActionsCellRendererParams;

  agInit(params: ChecklistActionsCellRendererParams): void {
    this.params = params;
  }

  refresh(params: ChecklistActionsCellRendererParams): boolean {
    this.params = params;
    return true;
  }

  onPreview(): void {
    this.params.onPreview?.(this.params.data);
  }

  onStart(): void {
    this.params.onStart?.(this.params.data);
  }

  onOpen(): void {
    this.params.onOpen?.(this.params.data);
  }
}
