import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { UniqueLabelBatch } from './unique-label-generator-api.service';

export interface UniqueLabelHistoryBatchActionCellParams extends ICellRendererParams<UniqueLabelBatch> {
  onViewDetails: (batchId: number) => void;
}

@Component({
  selector: 'app-unique-label-history-batch-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './unique-label-history-batch-action-dropdown-renderer.component.html',
})
export class UniqueLabelHistoryBatchActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: UniqueLabelHistoryBatchActionCellParams;

  agInit(params: UniqueLabelHistoryBatchActionCellParams): void {
    this.params = params;
  }

  refresh(params: UniqueLabelHistoryBatchActionCellParams): boolean {
    this.params = params;
    return true;
  }

  onViewDetails(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onViewDetails(Number(id));
    }
  }
}