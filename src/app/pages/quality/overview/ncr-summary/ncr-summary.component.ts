import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  selector: 'app-ncr-summary',
  templateUrl: `./ncr-summary.component.html`,
})
export class NcrSummaryComponent implements OnInit {

  @Input() public data: any;

  constructor() { }

  ngOnInit(): void { }


  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;
    this.barChartData = [];
    this.barChartData = {
      labels: this.data?.chartData?.label,
      datasets: [
        { data: this.data?.chartData?.completed_total, label: 'Completed Jobs', backgroundColor: '#2271B1', borderColor: '#2271B1' },
        { data: this.data?.chartData?.cancelled_total, label: 'Cancelled Jobs', backgroundColor: '#FF4500', borderColor: '#FF4500' },
        { data: this.data?.chartData?.open_total, label: 'Open Jobs', backgroundColor: '#E8E8E8', borderColor: '#E8E8E8' },
        { data: this.data?.chartData?.other_total, label: 'Other Jobs', backgroundColor: '#C0C0C0', borderColor: '#C0C0C0' },
      ],
    };

  }

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public barChartOptions: ChartConfiguration['options'] = {
    // We use these empty structures as placeholders for dynamic theming.

    responsive: true,
    maintainAspectRatio: false,

    scales: {
      y: {
        min: 0,
        stacked: true,
        title: {
          display: true,
          text: 'Total Jobs'
        }
      },
      x: {
        stacked: true,
        ticks: {
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0
        }
      },
    },
    hover: {
      mode: 'index',
      intersect: true,
    },
    plugins: {
      title: {
        display: true,
        text: 'Total Jobs By Month'
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        display: false,
        clamp: false,
      },
      tooltip: {
        borderWidth: 5,
        caretPadding: 10,
        displayColors: true,
        enabled: true,
        intersect: false,
        mode: 'x',
        titleMarginBottom: 10,
      },
    },
  };
  public barChartType: ChartType = 'bar';
  public barChartPlugins = [ChartDataLabels];

  public barChartData: any = []

}
