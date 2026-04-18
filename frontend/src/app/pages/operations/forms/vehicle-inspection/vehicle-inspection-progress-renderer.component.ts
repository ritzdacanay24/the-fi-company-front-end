import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center gap-2 h-100" style="min-width: 180px;">
      <div class="flex-grow-1">
        <div class="progress" style="height: 10px; border-radius: 5px;">
          <div class="progress-bar bg-success"
            role="progressbar"
            [style.width]="passedPct + '%'"
            [title]="passed + ' passed'">
          </div>
          <div class="progress-bar bg-danger"
            role="progressbar"
            [style.width]="failedPct + '%'"
            [title]="failed + ' failed'">
          </div>
        </div>
      </div>
      <span class="small text-nowrap" [class.text-success]="failedPct === 0" [class.text-danger]="failedPct > 0">
        {{ passed }}/{{ total }}
      </span>
    </div>
  `,
})
export class VehicleInspectionProgressRendererComponent implements ICellRendererAngularComp {
  passed = 0;
  failed = 0;
  total = 0;
  passedPct = 0;
  failedPct = 0;

  agInit(params: ICellRendererParams): void {
    this.refresh(params);
  }

  refresh(params: ICellRendererParams): boolean {
    const d = params.data;
    this.passed = d?.passed_count ?? 0;
    this.failed = d?.failed_count ?? 0;
    this.total = d?.total_count ?? 0;
    this.passedPct = this.total > 0 ? Math.round((this.passed / this.total) * 100) : 0;
    this.failedPct = this.total > 0 ? Math.round((this.failed / this.total) * 100) : 0;
    return true;
  }
}
