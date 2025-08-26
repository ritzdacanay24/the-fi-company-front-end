import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-dashboard-chart',
  template: `
    <div class="card h-100 border-0 shadow-sm">
      <div class="card-header bg-light border-0 pb-0">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="card-title mb-1 text-dark fw-semibold">{{title}}</h6>
            <small class="text-muted">{{subtitle}}</small>
          </div>
          <div class="dropdown" *ngIf="showOptions">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i class="mdi mdi-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#"><i class="mdi mdi-download me-2"></i>Export</a></li>
              <li><a class="dropdown-item" href="#"><i class="mdi mdi-refresh me-2"></i>Refresh</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="card-body d-flex align-items-center justify-content-center" [style.height]="height">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `
})
export class DashboardChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() chartConfig!: ChartConfiguration;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() height: string = '300px';
  @Input() showOptions: boolean = true;

  private chart: Chart | null = null;

  ngOnInit() {}

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    if (this.chartCanvas && this.chartConfig) {
      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chart = new Chart(ctx, this.chartConfig);
      }
    }
  }

  updateChart(newConfig: ChartConfiguration) {
    if (this.chart) {
      this.chart.destroy();
    }
    this.chartConfig = newConfig;
    this.createChart();
  }
}
