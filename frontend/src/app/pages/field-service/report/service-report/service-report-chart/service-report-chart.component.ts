import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  selector: 'app-service-report-chart',
  templateUrl: `./service-report-chart.component.html`,
})
export class ServiceReportChartComponent implements OnInit {

  @Input() public data: any;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;
    this.barChartData = {
      labels: this.data?.obj?.label,
      datasets: [],
    };

    for (const key in this.data.chartnew) {
      let color = this.data.chartnew[key].backgroundColor;
      this.barChartData.datasets.push(
        {
          data: this.data.chartnew[key].dataset,
          label: this.data.chartnew[key].label,
          backgroundColor: color,
          hoverBackgroundColor: color,
          borderColor: color,
          type: 'bar',
          borderWidth: 1,

          lineTension: 0,
          pointRadius: 1,
          tension: 1,
          fill: true,
        });
    }
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
          text: 'Job Count'
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
        text: 'Total Jobs By Service Type'
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        display: false,
        clamp: false
      },
      legend: {
        position: "right",
        align: "start"
      },
      tooltip: {
        borderWidth: 5,
        caretPadding: 10,
        displayColors: true,
        enabled: true,
        intersect: false,
        mode: 'x',
        titleMarginBottom: 10
      },
    },
  };
  public barChartType: ChartType = 'line';
  public barChartPlugins = [ChartDataLabels];

  public barChartData: any

}
