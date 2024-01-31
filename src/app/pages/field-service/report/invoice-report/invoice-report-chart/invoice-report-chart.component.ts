import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration, } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  selector: 'app-invoice-report-chart',
  templateUrl: `./invoice-report-chart.component.html`,
})
export class InvoiceReportChartComponent implements OnInit {

  @Input() public data: any;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;
    this.barChartData = {
      labels: this.data?.obj.label,
      datasets: [],
    };

    for (const key in this.data.chartnew) {
      let color = this.data.chartnew[key].backgroundColor;
      let borderColor = this.data.chartnew[key].borderColor || 'red';
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
        ticks: {
          callback: (value: any, index, values) => {
            return (new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            })).format(value);
          },
        },
        title: {
          display: true,
          text: 'Total Amount'
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
      datalabels: {
        anchor: 'end',
        align: 'end',
        display: false,
        clamp: false,
        formatter: (c) => {
          return (new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          })).format(c);
        },
      },
      title: {
        display: true,
        text: 'Total invoice amount by month'
      },
      legend: {
        position: "top",
      },
      tooltip: {
        borderWidth: 5,
        caretPadding: 10,
        displayColors: true,
        enabled: true,
        intersect: false,
        mode: 'x',
        titleMarginBottom: 10,
        callbacks: {
          label: function (tooltipIte: any,) {
            return tooltipIte.dataset.label + ': ' + (new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            })).format(tooltipIte.raw);
          },
        }
      },
    },
  };
  public barChartType: ChartType = 'line';
  public barChartPlugins = [ChartDataLabels];

  public barChartData: any

}
