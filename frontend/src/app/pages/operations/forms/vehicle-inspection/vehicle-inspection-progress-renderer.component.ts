import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center gap-2 h-100" style="min-width: 180px;">
      <ng-container *ngIf="!notUsed; else notUsedMessage">
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
      </ng-container>

      <ng-template #notUsedMessage>
        <span class="small text-muted text-nowrap">
          Vehicle Not Used
        </span>
      </ng-template>
    </div>
  `,
})
export class VehicleInspectionProgressRendererComponent implements ICellRendererAngularComp {
  notUsed = false;
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
    this.notUsed = Number(d?.not_used) === 1;
    this.passed = d?.passed_count ?? 0;
    this.failed = d?.failed_count ?? 0;
    this.total = d?.total_count ?? 0;
    this.passedPct = this.total > 0 ? Math.round((this.passed / this.total) * 100) : 0;
    this.failedPct = this.total > 0 ? Math.round((this.failed / this.total) * 100) : 0;
    return true;
  }
}
