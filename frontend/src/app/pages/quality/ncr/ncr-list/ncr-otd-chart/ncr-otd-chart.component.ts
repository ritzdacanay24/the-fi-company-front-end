import { Component, Input, SimpleChanges, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
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
  ApexLegend,
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
  labels: any;
  legend: ApexLegend;
};

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule, NgApexchartsModule],
  selector: "app-ncr-otd-chart",
  templateUrl: "./ncr-otd-chart.component.html",
})
export class NcrOtdChartComponent {
  @ViewChild("chart") chart: ChartComponent;

  @Input() data;
  @Input() labels = ["asfasdf", "asfasdf"];
  @Input() stacked;
  @Input() title;
  @Input() average;
  @Input() typeOfView;
  @Input() goal;

  chartOptions: Partial<ChartOptions> = {
    series: [],
    labels: [],
    legend: {
      position: "bottom",
    },
    chart: {
      height: 350,
      type: "pie",
      stacked: false,
    },
    tooltip: {
      shared: true,
      intersect: false,
      followCursor: false,
      fixed: {
        enabled: false,
        position: "bottom",
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        dataLabels: {
          position: "top",
          hideOverflowingLabels: true,
        },
      },
    },
    // dataLabels: {
    //     enabledOnSeries: [0],
    //     textAnchor: "middle",
    //     background: {
    //         enabled: true,
    //         foreColor: '#fff',
    //         borderRadius: 2,
    //         padding: 4,
    //         opacity: 0.9,
    //         borderWidth: 1,
    //         borderColor: '#fff'
    //     },
    //     enabled: true,
    //     formatter: (val: any) => {
    //         return val.toFixed(0) + '%';
    //     },
    //     offsetY: -10,
    //     style: {
    //         fontSize: "10px"
    //     },

    // },

    xaxis: {
      type: "category",
      categories: ["Asdf"],
      position: "bottom",
      labels: {
        rotate: 0,
        trim: false,
        rotateAlways: false,
        hideOverlappingLabels: true,
      },

      axisBorder: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
      crosshairs: {
        fill: {
          type: "gradient",
          gradient: {
            colorFrom: "#D8E3F0",
            colorTo: "#BED1E6",
            stops: [0, 100],
            opacityFrom: 0.4,
            opacityTo: 0.5,
          },
        },
      },
      // tooltip: {
      //     enabled: true,
      //     offsetY: -35
      // }
    },

    yaxis: {
      axisBorder: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
      labels: {
        show: true,
        // formatter: function (val) {
        //     return val.toFixed(0) + '%';
        // }
      },
      title: {
        text: "OTD Percentage",
      },
    },
    title: {
      text: "On Time Delivery",
      offsetY: 0,
      align: "center",
      style: {
        color: "#444",
      },
    },
  };

  constructor() {}

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;

    this.chart?.updateOptions({
      series: this.data,
      labels: ["Late", "On Time"],
      legend: {
        position: "bottom",
      },
    });
  }
}
