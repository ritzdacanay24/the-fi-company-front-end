import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface ULLabelActionCellParams extends ICellRendererParams {
  canEdit?: boolean;
  onEdit: (id: number) => void;
  onToggle: (id: number, status: string) => void;
  onVoid: (id: number) => void;
  onWriteOff: (id: number) => void;
  onRestore: (id: number) => void;
  onViewUsage: (id: number) => void;
}

@Component({
  selector: 'app-ul-label-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './ul-label-action-dropdown-renderer.component.html',
})
export class ULLabelActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: ULLabelActionCellParams;

  agInit(params: ULLabelActionCellParams): void {
    this.params = params;
  }

  refresh(params: ULLabelActionCellParams): boolean {
    this.params = params;
    return true;
  }

  get isUsed(): boolean {
    const raw = this.params?.data?.is_consumed;
    return raw === true || raw === 1 || raw === '1';
  }

  get canEditAction(): boolean {
    return !!(this.params as any)?.canEdit;
  }

  get hasUlNumber(): boolean {
    const ulNumber = this.params?.data?.ul_number;
    return typeof ulNumber === 'string' && ulNumber.trim().length > 0;
  }

  onEdit(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onEdit(Number(id));
    }
  }

  onToggle(): void {
    const id = this.params?.data?.id;
    const status = this.params?.data?.status;
    if (id != null && status) {
      this.params.onToggle(Number(id), String(status));
    }
  }

  onVoid(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onVoid(Number(id));
    }
  }

  onWriteOff(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onWriteOff(Number(id));
    }
  }

  onRestore(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onRestore(Number(id));
    }
  }

  onViewUsage(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onViewUsage(Number(id));
    }
  }
}