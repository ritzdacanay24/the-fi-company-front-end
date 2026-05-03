import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-bom-renderer-v2',
  template: `
    <div class="w-100 h-100 d-flex align-items-center justify-content-center">
      <button 
        type="button" 
        class="btn btn-outline-secondary btn-xs d-flex align-items-center justify-content-center bom-action-btn"
        (click)="onClick()"
        [title]="getTooltip()"
        [disabled]="!hasPartNumber()">
        <i class="mdi mdi-sitemap me-1"></i>
        <span class="d-none d-md-inline">BOM</span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .bom-action-btn {
      transition: all 0.2s ease;
      border-radius: 4px;
      min-width: 62px;
      height: 24px;
      padding: 0 8px;
      font-size: 11px;
      line-height: 1;
    }
    
    .bom-action-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .bom-action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .bom-action-btn i {
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .bom-action-btn {
        min-width: 32px;
        padding: 0 6px;
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
