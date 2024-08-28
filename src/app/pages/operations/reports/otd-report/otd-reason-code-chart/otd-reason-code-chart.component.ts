import { Component, Input, SimpleChanges, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";
import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexPlotOptions,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexFill,
  NgApexchartsModule,
  ApexTooltip,
  ApexStroke,
} from "ng-apexcharts";
import { NgChartsModule } from "ng2-charts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
};

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule, NgApexchartsModule],
  selector: "app-otd-reason-code-chart",
  templateUrl: "./otd-reason-code-chart.component.html",
})
export class OtdReasonCodeChartComponent {
  @ViewChild("chart") chart: ChartComponent;
  public chartOptions: any;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        width: 400,
        height: 400,
        type: "pie",
      },
      labels: [],
    };
  }

  @Input() data;

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;
    this.chartOptions = {
      chart: {
        width: 500,
        type: "pie",
        toolbar: {
          show: true,
        },
      },
      stroke: {
        show: true,
        colors: undefined,
        width: 0.5,
      },
      dataLabels: {
        enabled: true,
        formatter(val, opts) {
          const name = opts.w.globals.labels[opts.seriesIndex];
          return [val.toFixed(0) + "%"];
        },
        textAnchor: "end",
        dropShadow: {},
        background: {
          enabled: true,
          color: "#000",
          opacity: 0.2,
        },
        offsetX: -50,
        offsetY: 0,
      },

      grid: {
        padding: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
      legend: {
        fontSize: "10px",
        position: "bottom",
        horizontalAlign: "center",
        formatter: function (val, opts) {
          return val + " - " + opts.w.globals.series[opts.seriesIndex];
        },
        onItemHover: false,
      },
      theme: {
        monochrome: {
          enabled: true,
        },
      },
      labels: this.data?.label,
      title: {
        align: "center",
        text: "Late Reason Codes",
      }
    };
    this.chartOptions.series = this.data?.value;
    this.chartOptions.colors = [
      "#a8c7f4",
      "#83aff0",
      "#4779c4",
      "#3c649f",
      "#2c456b",
      "#1b2d48",
    ];
  }
}
