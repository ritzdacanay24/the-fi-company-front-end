import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  selector: 'app-invoice-summary',
  templateUrl: `./invoice-summary.component.html`,
})
export class InvoiceSummaryComponent implements OnInit {

  @Input() public data: any;

  constructor() { }

  ngOnInit(): void { }


  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;
    this.barChartData = {
      labels: this.data?.chartData?.label,
      datasets: [
        { data: this.data?.chartData?.value, label: 'Invoice Amount', backgroundColor: '#2271B1', borderColor: '#2271B1', },
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
          text: 'Amount'
        }
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Invoice Amount By Month'
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        formatter: (c) => {
          return (new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          })).format(c);
        },
        display: 'auto',
        clamp: false
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
  public barChartType: ChartType = 'bar';
  public barChartPlugins = [ChartDataLabels];

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [],
  };

}
