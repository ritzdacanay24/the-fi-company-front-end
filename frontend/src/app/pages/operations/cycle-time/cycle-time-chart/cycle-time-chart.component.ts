import { Component, ViewChild } from "@angular/core";
import { CycleTimeService } from "@app/core/api/cycle-time/cycle-time.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { EditIconComponent } from "@app/shared/ag-grid/edit-icon/edit-icon.component";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridOptions } from "ag-grid-community";
import moment from "moment";

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
  dateFrom = moment().subtract(2,'week').format('YYYY-MM-DD');
  dateTo = moment().add(1,'month').format('YYYY-MM-DD');

  async getData() {
    let cycleTimeChart = await this.cycleTimesService.cycleTimeChart(
      this.typeOfView,
      this.dateFrom,
      this.dateTo
    );

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

  constructor(
    private cycleTimesService: CycleTimeService,
    public authenticationService: AuthenticationService
  ) {
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
        animations: {
          enabled: false
        },
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
      headerName: "Cycle Time (HRS)",
      filter: "agTextColumnFilter",
      editable: true,
      cellRenderer: EditIconComponent,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
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
    getRowId: (params) => params.data.wo_nbr?.toString(),
    onCellEditingStopped: (event) => {
      if (event.oldValue == event.newValue || event.value === undefined) return;
      this.update(event.data);
    },
  };

  public async update(data: any) {

    try {
      this.gridApi?.showLoadingOverlay();
      let res = await this.cycleTimesService.create({
        partNumber: data.part_number,
        updatedDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedBy: this.authenticationService.currentUserValue.full_name,
        cycleTime: data.cycleTime,
      });

      await this.getData();

      let rowNode = this.gridApi.getRowNode(data.wo_nbr);
      rowNode.data.cycleTime = data.cycleTime;
      this.gridApi.redrawRows({ rowNodes: [rowNode] });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
