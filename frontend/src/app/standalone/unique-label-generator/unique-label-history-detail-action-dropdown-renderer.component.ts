import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { UniqueLabelIdentifier } from './unique-label-generator-api.service';

export interface UniqueLabelHistoryDetailActionCellParams extends ICellRendererParams<UniqueLabelIdentifier> {
  isReprintEnabled: boolean;
  onReprint: (item: UniqueLabelIdentifier) => void;
  onZebra: (item: UniqueLabelIdentifier) => void;
}

@Component({
  selector: 'app-unique-label-history-detail-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './unique-label-history-detail-action-dropdown-renderer.component.html',
})
export class UniqueLabelHistoryDetailActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: UniqueLabelHistoryDetailActionCellParams;

  agInit(params: UniqueLabelHistoryDetailActionCellParams): void {
    this.params = params;
  }

  refresh(params: UniqueLabelHistoryDetailActionCellParams): boolean {
    this.params = params;
    return true;
  }

  get isReprintEnabled(): boolean {
    return Boolean(this.params?.isReprintEnabled);
  }

  onReprint(): void {
    if (this.isReprintEnabled && this.params?.data) {
      this.params.onReprint(this.params.data);
    }
  }

  onZebra(): void {
    if (this.isReprintEnabled && this.params?.data) {
      this.params.onZebra(this.params.data);
    }
  }
}