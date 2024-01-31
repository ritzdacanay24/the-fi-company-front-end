import { Component, Input, OnInit, SimpleChanges, ViewChild } from "@angular/core";
// window.Apex = {
//   chart: {
//     foreColor: '#ccc',
//     toolbar: {
//       show: false
//     },
//   },
//   stroke: {
//     width: 3
//   },
//   dataLabels: {
//     enabled: false
//   },
//   tooltip: {
//     theme: 'dark'
//   },
//   grid: {
//     borderColor: "#535A6C",
//     xaxis: {
//       lines: {
//         show: true
//       }
//     }
//   }
// };
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexFill,
  ApexYAxis,
  ApexTooltip,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexLegend,
  ApexGrid,
  ApexTheme,
  NgApexchartsModule
} from "ng-apexcharts";
import { SharedModule } from '@app/shared/shared.module';
import { returnAvg } from "src/assets/js/util";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  title: ApexTitleSubtitle;
  labels: string[];
  stroke: any;
  dataLabels: any;
  fill: ApexFill;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  theme: ApexTheme;
  grid: ApexGrid;
};

@Component({
  standalone: true,
  imports: [SharedModule, NgApexchartsModule],
  selector: "app-qir-summary",
  template: `
        <div id="chart">
            <apx-chart
                #chart
                [series]="chartOptions.series"
                [chart]="chartOptions.chart"
                [yaxis]="chartOptions.yaxis"
                [xaxis]="chartOptions.xaxis"
                [labels]="chartOptions.labels"
                [stroke]="chartOptions.stroke"
                [title]="chartOptions.title"
                [dataLabels]="chartOptions.dataLabels"
                [fill]="chartOptions.fill"
                [tooltip]="chartOptions.tooltip"
            ></apx-chart>
        </div>
    `,
})
export class QirSummaryComponent implements OnInit {

  @Input() public data: any;
  max: any;

  @ViewChild("chart") chart: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  constructor() {
    this.chartOptions = {
      theme: { mode: 'light' },
      series: [],
      chart: {
        foreColor: '#ccc',
        height: 420,
        type: "line"
      },
      stroke: {
        width: [2, 2, 2],
      },
      title: {
        text: "Failure types",
        style: {
          color: '#000'
        },
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [1]
      },
      labels: [],
    };
  }

  myFunc(total, num) {
    return total + num;
  }

  ngOnChanges(data: SimpleChanges) {
    if (!!this.data) {
      this.data.value = this.data?.value ? this.data.value : [0]
      var pers = [];
      var count = 0;
      var dem = 0;
      for (var i = 0; i < this.data.value.length; i++) {
        dem = this.data.value[i] + dem;
        count = this.data.value[i] + count;
        pers.push(count);
      }

      this.max = this.data.value.reduce(this.myFunc);
      var ll = [];
      for (var l = 0; l < pers.length; l++) {
        let e = pers[l] / this.max;
        let ee = e * 100;
        ll.push((ee.toFixed(1)));
      }

      this.chartOptions.series = [
        {
          name: "Frequency",
          type: "column",
          data: this.data.value,
          color: '#2271B1'

        },
        {
          name: "Cumulative %",
          type: "line",
          data: ll,
        },
        {
          name: "80% cutoff",
          type: "line",
          data: returnAvg(pers.length, 80),

        }
      ]

      this.chart.updateOptions({
        labels: this.data.label,
        grid: {
          strokeDashArray: 0,
          borderColor: "#535A6C",
        },
        yaxis: [
          {
            title: {
              text: "Frequency",
              style: {
                color: '#2271B1',
              }
            },
            max: this.max,
            axisBorder: {
              show: true,
              color: '#2271B1'
            },
            labels: {
              style: {
                colors: '#2271B1',
              }
            },
            tickAmount: 10
          },
          {
            opposite: true,
            max: 100,
            min: 0,
            title: {
              text: "Cumulative %",
              style: {
                color: '#4c9173',
              }
            },
            axisBorder: {
              show: true,
              color: '#4c9173'
            },
            labels: {
              style: {
                colors: '#4c9173',
              },
              formatter: function (value) {
                return value + "%";
              }
            },
          },
          {
            max: 100,
            min: 0,
            dataLabels: {
              enabled: false,
            },
            legend: {
              labels: {
                show: false
              },
            },

            labels: {
              show: false,
              style: {
                colors: '',
              },
              formatter: function (value) {
                return value + "%";
              }
            }
          }
        ]
      })
    }
  }

  ngOnInit(): void { }
}
