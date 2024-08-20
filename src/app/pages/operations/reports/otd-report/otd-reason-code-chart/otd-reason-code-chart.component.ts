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
        width: 500,
        type: "pie",
      },
      labels: [],
      legend: {
        show: false,
      },
    };
  }

  @Input() data;

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;

    this.chartOptions = {
      chart: {
        width: 400,
        height: 400,
        type: "pie",
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        
      },
      labels: this.data?.label,
    };
    this.chartOptions.series = this.data?.value;
  }
}
