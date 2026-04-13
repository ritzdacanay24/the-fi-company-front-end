import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-bom-renderer-v2',
  template: `
    <button 
      type="button" 
      class="btn btn-outline-info btn-xs d-flex align-items-center justify-content-center"
      (click)="onClick()"
      [title]="getTooltip()"
      [disabled]="!hasPartNumber()">
      <i class="mdi mdi-sitemap" style="font-size: 0.75rem;"></i>
      <span class="d-none d-md-inline ms-1" style="font-size: 0.75rem;">BOM</span>
    </button>
  `,
  styles: [`
    .btn {
      transition: all 0.2s ease;
      border-radius: 3px;
      min-width: 45px;
      height: 24px;
      padding: 0.15rem 0.3rem;
      font-size: 0.75rem;
    }
    
    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-outline-info {
      border-color: #0dcaf0;
      color: #0dcaf0;
    }
    
    .btn-outline-info:hover:not(:disabled) {
      background-color: #0dcaf0;
      border-color: #0dcaf0;
      color: #000;
    }
    
    @media (max-width: 768px) {
      .btn {
        min-width: 32px;
        padding: 0.1rem 0.25rem;
      }
    }
  `],
  standalone: true
})
export class BomRendererV2Component implements ICellRendererAngularComp {
  private params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  onClick(): void {
    if (this.hasPartNumber() && this.params.context?.onBomClick) {
      const partNumber = this.getPartNumber();
      const soNumber = this.getSoNumber();
      this.params.context.onBomClick({
        partNumber,
        soNumber,
        rowData: this.params.data
      });
    }
  }

  hasPartNumber(): boolean {
    const partNumber = this.getPartNumber();
    return !!(partNumber && String(partNumber).trim().length > 0);
  }

  private getPartNumber(): string {
    // Try multiple possible field names for part number
    return this.params.data?.SOD_PART || 
           this.params.data?.part_number || 
           this.params.data?.partNumber || 
           this.params.data?.part || 
           '';
  }

  private getSoNumber(): string {
    // Try multiple possible field names for SO number
    return this.params.data?.SOD_NBR || 
           this.params.data?.so_number || 
           this.params.data?.salesOrder || 
           this.params.data?.so || 
           '';
  }

  getTooltip(): string {
    if (!this.hasPartNumber()) {
      return 'No part number available';
    }
    const partNumber = this.getPartNumber();
    return `View BOM structure for ${partNumber}`;
  }
}
