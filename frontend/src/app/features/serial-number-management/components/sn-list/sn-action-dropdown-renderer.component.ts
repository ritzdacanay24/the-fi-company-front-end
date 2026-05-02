import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { SerialNumber } from '../../models/serial-number.model';

type SimpleSerialNumberStatus = 'available' | 'used' | 'voided';

export interface SnActionCellParams extends ICellRendererParams {
  onMarkUsed: (row: SerialNumber) => void;
  onRestoreAvailable: (row: SerialNumber) => void;
  onMarkVoided: (row: SerialNumber) => void;
}

@Component({
  selector: 'app-sn-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './sn-action-dropdown-renderer.component.html',
})
export class SnActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: SnActionCellParams;

  agInit(params: SnActionCellParams): void {
    this.params = params;
  }

  refresh(params: SnActionCellParams): boolean {
    this.params = params;
    return true;
  }

  get status(): SimpleSerialNumberStatus {
    const rawStatus = String(this.params?.data?.status || '').toLowerCase();
    if (rawStatus === 'available') {
      return 'available';
    }

    if (rawStatus === 'returned' || rawStatus === 'defective' || rawStatus === 'voided') {
      return 'voided';
    }

    return 'used';
  }

  onMarkUsed(): void {
    if (this.params?.data) {
      this.params.onMarkUsed(this.params.data as SerialNumber);
    }
  }

  onRestoreAvailable(): void {
    if (this.params?.data) {
      this.params.onRestoreAvailable(this.params.data as SerialNumber);
    }
  }

  onMarkVoided(): void {
    if (this.params?.data) {
      this.params.onMarkVoided(this.params.data as SerialNumber);
    }
  }
}
