import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface SgAssetActionCellParams extends ICellRendererParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

@Component({
  selector: 'app-sg-asset-action-dropdown-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './sg-asset-action-dropdown-renderer.component.html',
})
export class SgAssetActionDropdownRendererComponent implements ICellRendererAngularComp {
  params!: SgAssetActionCellParams;

  agInit(params: SgAssetActionCellParams): void {
    this.params = params;
  }

  refresh(params: SgAssetActionCellParams): boolean {
    this.params = params;
    return true;
  }

  onView(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onView(String(id));
    }
  }

  onEdit(): void {
    const id = this.params?.data?.id;
    if (id != null) {
      this.params.onEdit(String(id));
    }
  }
}
