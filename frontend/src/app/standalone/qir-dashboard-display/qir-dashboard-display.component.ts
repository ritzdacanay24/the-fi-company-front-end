import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QirDashboardComponent } from '@app/pages/quality/qir/qir-dashboard/qir-dashboard.component';

@Component({
  selector: 'app-qir-dashboard-display',
  standalone: true,
  imports: [CommonModule, QirDashboardComponent],
  template: `
    <app-qir-dashboard 
      [isDisplayMode]="true" 
      [showDisplayButton]="false"
      [autoRefreshInterval]="300000">
    </app-qir-dashboard>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      overflow: auto;
    }
  `]
})
export class QirDashboardDisplayComponent {
  constructor() {}
}