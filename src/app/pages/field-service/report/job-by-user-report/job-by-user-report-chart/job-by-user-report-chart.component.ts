import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration} from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  selector: 'app-job-by-user-report-chart',
  templateUrl: `./job-by-user-report-chart.component.html`,
})
export class JobByUserReportChartComponent implements OnInit {

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
      let borderColor = this.data.chartnew[key].borderColor || 'red';
      this.barChartData.datasets.push(
        {
          data: this.data.chartnew[key].dataset,
          label: this.data.chartnew[key].label,
          backgroundColor: color,
          hoverBackgroundColor: color,
          borderColor: color,
          type: this.data.chartnew[key]?.type ? 'line' : 'bar',
          borderWidth: 1,

          lineTension: 0,
          pointRadius: 1,
          tension: 1,
          fill: false,
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
        title: {
          display: true,
          text: 'Job Count'
        }
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Total In-town/Out-of-town jobs by tech'
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
        borderWidth: 1,
        caretPadding: 10,
        displayColors: true,
        enabled: true,
        intersect: true,
        mode: 'nearest',
        titleMarginBottom: 10,

      }
    },
  };
  public barChartType: ChartType = 'bar';
  public barChartPlugins = [ChartDataLabels];

  public barChartData: any

}
