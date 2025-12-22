import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface ActionCellParams extends ICellRendererParams {
  onPrint: (data: any) => void;
  onVoid: (data: any) => void;
  onDelete: (data: any) => void;
  onRestore: (data: any) => void;
  onVerify: (data: any) => void;
  requiresVerification: (data: any) => boolean;
}

@Component({
  selector: 'app-action-cell-renderer',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  templateUrl: './action-cell-renderer.component.html',
  styleUrls: ['./action-cell-renderer.component.scss']
})
export class ActionCellRendererComponent implements ICellRendererAngularComp {
  params!: ActionCellParams;
  isNewSystem = false;
  isVoided = false;
  verificationStatus = '';
  requiresVerif = false;

  agInit(params: ActionCellParams): void {
    this.params = params;
    this.updateState();
  }

  refresh(params: ActionCellParams): boolean {
    this.params = params;
    this.updateState();
    return true;
  }

  private updateState(): void {
    if (!this.params.data) {
      this.isNewSystem = false;
      this.isVoided = false;
      this.verificationStatus = '';
      this.requiresVerif = false;
      return;
    }
    
    this.isNewSystem = this.params.data.source_table === 'serial_assignments';
    this.isVoided = this.params.data.is_voided == 1 || this.params.data.is_voided === true;
    this.verificationStatus = this.params.data.verification_status;
    this.requiresVerif = this.params.requiresVerification(this.params.data);
  }

  onPrint(): void {
    this.params.onPrint(this.params.data);
  }

  onVoid(): void {
    this.params.onVoid(this.params.data);
  }

  onDelete(): void {
    this.params.onDelete(this.params.data);
  }

  onRestore(): void {
    this.params.onRestore(this.params.data);
  }

  onVerify(): void {
    this.params.onVerify(this.params.data);
  }

  get verifyIcon(): string {
    return this.verificationStatus === 'failed' ? 'mdi-camera-retake' : 'mdi-camera';
  }

  get verifyText(): string {
    return this.verificationStatus === 'failed' ? 'Retry' : 'Verify';
  }
}
