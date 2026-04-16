import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { UniqueLabelBatch } from './unique-label-generator-api.service';

export interface UniqueLabelAdminActionCellParams extends ICellRendererParams<UniqueLabelBatch> {
  onArchive: (batch: UniqueLabelBatch) => void;
  onSoftDelete: (batch: UniqueLabelBatch) => void;
  onRestore: (batch: UniqueLabelBatch) => void;
  onHardDelete: (batch: UniqueLabelBatch) => void;
}

@Component({
  selector: 'app-unique-label-admin-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './unique-label-admin-action-dropdown-renderer.component.html',
})
export class UniqueLabelAdminActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: UniqueLabelAdminActionCellParams;

  agInit(params: UniqueLabelAdminActionCellParams): void {
    this.params = params;
  }

  refresh(params: UniqueLabelAdminActionCellParams): boolean {
    this.params = params;
    return true;
  }

  get status(): string {
    return String(this.params?.data?.status || '').toLowerCase();
  }

  get canArchive(): boolean {
    return this.status !== 'archived';
  }

  get canSoftDelete(): boolean {
    return this.status !== 'deleted';
  }

  get canRestore(): boolean {
    return this.status !== 'active';
  }

  onArchive(): void {
    if (this.canArchive && this.params?.data) {
      this.params.onArchive(this.params.data);
    }
  }

  onSoftDelete(): void {
    if (this.canSoftDelete && this.params?.data) {
      this.params.onSoftDelete(this.params.data);
    }
  }

  onRestore(): void {
    if (this.canRestore && this.params?.data) {
      this.params.onRestore(this.params.data);
    }
  }

  onHardDelete(): void {
    if (this.params?.data) {
      this.params.onHardDelete(this.params.data);
    }
  }
}