import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

interface IgtSerialRow {
  id: number;
  serial_number: string;
  status: 'available' | 'reserved' | 'used' | string;
  is_active?: number | boolean;
}

export interface IgtManageExistingActionCellParams extends ICellRendererParams<IgtSerialRow> {
  canManage: boolean;
  onViewAssignmentDetails: (serial: IgtSerialRow) => void;
  onEdit: (serial: IgtSerialRow) => void;
  onMarkUsed: (serial: IgtSerialRow) => void;
  onRestoreAvailable: (serial: IgtSerialRow) => void;
  onWriteOff: (serial: IgtSerialRow) => void;
}

@Component({
  selector: 'app-igt-manage-existing-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './igt-manage-existing-action-dropdown-renderer.component.html',
})
export class IgtManageExistingActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: IgtManageExistingActionCellParams;

  private normalizeStatus(rawStatus: unknown): string {
    return String(rawStatus ?? '').trim().toLowerCase();
  }

  agInit(params: IgtManageExistingActionCellParams): void {
    this.params = params;
  }

  refresh(params: IgtManageExistingActionCellParams): boolean {
    this.params = params;
    return true;
  }

  get canManageActions(): boolean {
    return !!this.params?.canManage;
  }

  get canMarkUsed(): boolean {
    const status = this.normalizeStatus(this.params?.data?.status);
    return status !== 'used';
  }

  get canRestoreAvailable(): boolean {
    const status = this.normalizeStatus(this.params?.data?.status);
    return status === 'used' || status === 'reserved';
  }

  get canWriteOff(): boolean {
    const raw = this.params?.data?.is_active;
    if (raw === false || raw === 0) return false; // already written off
    const status = this.normalizeStatus(this.params?.data?.status);
    return status === 'available' || status === 'reserved';
  }

  onEdit(): void {
    if (this.canManageActions && this.params?.data) {
      this.params.onEdit(this.params.data);
    }
  }

  onViewAssignmentDetails(): void {
    if (this.params?.data) {
      this.params.onViewAssignmentDetails(this.params.data);
    }
  }

  onMarkUsed(): void {
    if (this.canManageActions && this.canMarkUsed && this.params?.data) {
      this.params.onMarkUsed(this.params.data);
    }
  }

  onRestoreAvailable(): void {
    if (this.canManageActions && this.canRestoreAvailable && this.params?.data) {
      this.params.onRestoreAvailable(this.params.data);
    }
  }

  onWriteOff(): void {
    if (this.canManageActions && this.canWriteOff && this.params?.data) {
      this.params.onWriteOff(this.params.data);
    }
  }
}
