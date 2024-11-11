import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from "ng2-charts";
import ChartDataLabels from "chartjs-plugin-datalabels";
import moment from "moment";
import { SharedModule } from "@app/shared/shared.module";
import { isDarkTheme } from "@app/shared/config/ag-grid.config";
import { CycleTimeService } from "@app/core/api/cycle-time/cycle-time.service";
import { nFormatter } from "src/assets/js/util";

@Component({
  standalone: true,
  imports: [SharedModule, ],
  selector: "app-cycle-times-chart",
  template: `
     Cycle Time Chart
    <div style="display: block">
      <!-- <canvas
        baseChart
        [datasets]="chartData"
        [labels]="barChartLabels"
        [options]="barChartOptions"
        [plugins]="barChartPlugins"
        [legend]="barChartLegend"
        [chartType]="barChartType"
        height="80"
      >
      </canvas> -->
    </div>
  `,
})
export class CycleTimeChartComponent implements OnInit {
  @Input() public typeOfView: any;
  @Input() public data: any;
  @Input() public dailyDateView: any;
  @Output() dailyOpenedEvent = new EventEmitter<any>();
  @Output() filterGridEvent = new EventEmitter<any>();
  @ViewChild(BaseChartDirective) chart: BaseChartDirective;

  dateFrom = "";
  dateTo = "";

  chartData;
  async getData(dateFrom?, dateTo?) {
    let data = await this.api.getCycleTimes();

    this.chartData = data.chart;
  }

  public barChartOptions: ChartOptions | any = {
    responsive: true,
    maintainAspectRatio: true,
    hover: {
      onHover: function (e: any) {
        var point = this.getElementAtEvent(e);
        if (point.length) e.target.style.cursor = "pointer";
        else e.target.style.cursor = "default";
      },
    },
    onClick: (c, i) => {
      if (this.typeOfView !== "Production") return;

      if (this.dailyDateView) {
        let e: any = i[0];
        var x_value = this.data.label[e._index];
        this.filterGridEvent.emit(x_value);
        return;
      }

      let e: any = i[0];
      var x_value = this.data.label[e._index];
      const myArr = x_value.split(" ");
      this.dateFrom = moment(myArr[0]).format("YYYY-MM-DD");
      this.dateTo = moment(myArr[2]).subtract(2, "day").format("YYYY-MM-DD");
      this.dailyOpenedEvent.emit(this.dateFrom + " - " + this.dateTo);

      this.getData(this.dateFrom, this.dateTo);
    },
    title: {
      display: true,
      text: `Estimated Cycle Times`,
      fontColor: isDarkTheme() ? "white" : "black",
      fontSize: 16,
    },
    tooltips: {
      enabled: true,
      mode: "index",
      intersect: false,
      callbacks: {
        label: function (tooltipItem, data) {
          var corporation = data.datasets[tooltipItem.datasetIndex].label;
          let value: any;
          value = tooltipItem.yLabel;
          return `${corporation} ${value.toFixed(2)}`;
        },
      },
    },
    scales: {
      xAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: "Total Hours by Week",
            fontColor: isDarkTheme() ? "white" : "black",
          },
          gridLines: {
            display: false,
          },
          display: true,
          stacked: true,
          ticks: {
            stepSize: 1,
            min: 0,
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            fontColor: isDarkTheme() ? "white" : "black",
            maxTicksLimit: 10,
            callback: (value: any, index, values) => {
              const myArr = value.split(" ");
              if (myArr.length > 1) {
                if (value == "Past Due") {
                  return "Total Past Due";
                } else {
                  var weeknumber = moment(myArr[0], "MM-DD-YYYY").isoWeek();
                  console.log(myArr);
                  return [
                    `${moment(myArr[0], "M/D/YYYY").format(
                      "M/D/YY"
                    )} - ${moment(myArr[2], "M/D/YYYY").format("M/D/YY")}`,
                    `(WW${weeknumber})`,
                  ];
                }
              } else {
                return value;
              }
            },
          },
        },
      ],
      yAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: "Total Hours",
            fontColor: isDarkTheme() ? "white" : "black",
          },
          gridLines: {
            color: isDarkTheme() ? "rgba(255,255,255,0.1)" : "#F0F0F0",
          },

          stacked: true,
          ticks: {
            callback: function (value, index, values) {
              return nFormatter(value, 2);
            },
            fontColor: isDarkTheme() ? "white" : "black",
          },
        },
      ],
    },
    plugins: {
      datalabels: {
        anchor: "end",
        align: "end",
        backgroundColor: "rgb(190,190,190, 0.9)",
        borderColor: "#B8B8B8",
        borderWidth: 1,
        borderRadius: 2,
        color: (context) => {
          var index = context.dataIndex;
          var value = context.dataset.data[index];
          return "#000";
        },
        formatter: (c, i) => {
          if (i.dataIndex == 0 && !this.dailyDateView) {
            return (c + this.data.totalHrsOverdueArray[0]).toFixed(2) + " Hrs";
          }
          return c.toFixed(2) + " Hrs";
        },
        display: (context) => {
          if (context.datasetIndex == 0 || context.datasetIndex == 1) {
            return false;
          }
          return "auto";
        },
        clamp: false,
        clip: false,
      },
    },
    legend: {
      display: true,
      position: "top",
      labels: {
        fontColor: isDarkTheme() ? "white" : "black",
        fontSize: 12,
      },
    },
  };
  public barChartLabels: any[] = [];
  public barChartType: ChartType = "bar";
  public barChartLegend = true;
  public barChartPlugins = [ChartDataLabels];

  public barChartData = [
    {
      data: [],
      type: "line",
      label: "Available Hrs",
      borderColor: "orange",
      fillColor: "#000",
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 3,
      fill: true,
      borderDash: [2, 2],
      backgroundColor: "rgba(255, 255, 255, 0.0)",
    },
    {
      label: "Past Due Hrs",
      data: [],
      backgroundColor: "rgb(178,34,34)",
      hoverBackgroundColor: "rgb(178,34,34)",
      borderColor: "rgb(178,34,34)",
    },
    {
      data: [],
      label: "Hrs",
      backgroundColor: [],
      hoverBackgroundColor: [],
      borderColor: "rgba(95, 130, 149, 1)",
      fillColor: "#000",
    },
  ];

  constructor(private api: CycleTimeService) {}

  ngOnInit(): void {
    //this.getData();
  }

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;

    this.barChartData[0].data = this.data.weeklyUsers;
    this.barChartData[1].data = this.data.totalHrsOverdueArray;
    this.barChartData[2].data = this.data.values;
    this.barChartData[2].backgroundColor = this.data.colors;
    this.barChartData[2].hoverBackgroundColor = this.data.colors;
    this.barChartLabels = this.data.label;

    if (this.dailyDateView == "") {
      this.dateFrom = "";
      this.dateTo = "";
    }
  }
}
