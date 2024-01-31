import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration} from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  selector: 'app-contractor-vs-tech-report-chart',
  templateUrl: `./contractor-vs-tech-report-chart.component.html`,
})
export class ContractorVsTechReportChartComponent implements OnInit {

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
          type: 'line',
          borderWidth: 3,

          lineTension: 0,
          tension: 1,
          fill: false,
          pointBorderColor: color,
          pointBackgroundColor: color,
          pointColor: color,
          pointStyle: 'circle',
          pointRadius: 5,
          pointHoverRadius: 15
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
        stacked: false,
        title: {
          display: true,
          text: 'Job Count'
        }
      },
      x: {
        stacked: false,
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
        text: 'Jobs by contrator and techs'
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        display: false,
        clamp: false
      },
      legend: {
        position: "top",
        align: "center"
      },
      tooltip: {
        borderWidth: 5,
        caretPadding: 10,
        displayColors: true,
        enabled: true,
        intersect: false,
        mode: 'index',
        titleMarginBottom: 10
      },
    },
  };
  public barChartType: ChartType = 'line';
  public barChartPlugins = [ChartDataLabels];

  public barChartData: any

}
