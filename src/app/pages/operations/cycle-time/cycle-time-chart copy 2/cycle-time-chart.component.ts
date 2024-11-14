import { Component, ViewChild } from "@angular/core";
import { CycleTimeService } from "@app/core/api/cycle-time/cycle-time.service";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridOptions } from "ag-grid-community";

import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexFill,
  ApexYAxis,
  ApexTooltip,
  ApexTitleSubtitle,
  ApexXAxis,
  NgApexchartsModule,
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  title: ApexTitleSubtitle;
  labels: string[];
  stroke: any; // ApexStroke;
  dataLabels: any; // ApexDataLabels;
  fill: ApexFill;
  tooltip: ApexTooltip;
};

@Component({
  standalone: true,
  imports: [SharedModule, NgApexchartsModule, AgGridModule],
  selector: "app-cycle-time-chart",
  templateUrl: "./cycle-time-chart.component.html",
})
export class CycleTimeChartComponent {
  @ViewChild("chart") chart: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  dataTable: any;
  typeOfView = "Weekly";
  dateFrom = "2024-08-01";
  dateTo = "2025-05-01";

  async getData() {
    let cycleTimeChart = await this.cycleTimesService.cycleTimeChart(
      this.typeOfView,
      this.dateFrom,
      this.dateTo
    );
    console.log(cycleTimeChart.chart.headCountData.dataset);

    this.dataTable = cycleTimeChart.allData;

    this.series = [
      {
        name: "Total Hrs",
        type: "column",
        data: cycleTimeChart.chart.chartnew.dataset,
        colors: cycleTimeChart.chart.chartnew.backgroundColor,
      },
      // {
      //   name: "Availability",
      //   type: "line",
      //   data: cycleTimeChart.chart.headCountData.dataset,
      //   colors: cycleTimeChart.chart.headCountData.backgroundColor,
      // },
    ];

    this.chartOptions.labels = cycleTimeChart.chart.obj.label;
  }
  series = [];

  constructor(private cycleTimesService: CycleTimeService) {
    this.getData();
    this.chartOptions = {
      series: [],
      chart: {
        height: 350,
        type: "line",
      },
      stroke: {
        width: [0, 2],
      },
      title: {
        text: "Cycle Times",
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0],
        formatter: function (data) {
          if (data != 0) {
            return data;
          }
        },
      },
      labels: [],
      xaxis: {
        type: "category",
      },
      yaxis: [
        {
          title: {
            text: "Total Hrs",
          },

        },
        // {
        //   display: false,
        //   opposite: false,
        //   title: {
        //     text: "Availability",
        //   },
        // },
      ],
    };
  }

  columnDefs: ColDef[] = [
    {
      field: "wo_nbr",
      headerName: "WO #",
      filter: "agTextColumnFilter",
    },
    {
      field: "part_number",
      headerName: "Part Number",
      filter: "agTextColumnFilter",
    },
    {
      field: "part_description",
      headerName: "Description",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_due_by",
      headerName: "Due By",
      filter: "agTextColumnFilter",
    },
    {
      field: "employees",
      headerName: "Head Count",
      filter: "agTextColumnFilter",
    },
    {
      field: "cycleTime",
      headerName: "Cycle Time",
      filter: "agTextColumnFilter",
    },
    {
      field: "open_qty",
      headerName: "Open Qty",
      filter: "agTextColumnFilter",
    },
    {
      field: "ext_cycle_time",
      headerName: "Total Cycle Times",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_wkctr",
      headerName: "Work Center",
      filter: "agTextColumnFilter",
    },
    {
      field: "week",
      headerName: "Week",
      filter: "agTextColumnFilter",
    },
    {
      field: "year",
      headerName: "Year",
      filter: "agTextColumnFilter",
    },
  ];

  title = "Cycle Time Chart";

  gridApi: any;
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {},
    getRowId: (params) => params.data.pt_part?.toString(),
  };
}
