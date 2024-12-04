import {
  Component,
  Input,
  OnInit,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { ChartType, ColDef, GridOptions } from "ag-grid-community";
import { ChartConfiguration, ChartData, ChartOptions } from "chart.js";
import { BaseChartDirective, NgChartsModule } from "ng2-charts";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { SharedModule } from "src/app/shared/shared.module";
import { ReportService } from "@app/core/api/field-service/report.service";
import { CycleTimeService } from "@app/core/api/cycle-time/cycle-time.service";
import { isDarkTheme } from "@app/shared/config/ag-grid.config";
import { nFormatter } from "src/assets/js/util";
import moment from "moment";
import { AgGridModule } from "ag-grid-angular";

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule, AgGridModule],
  selector: "app-cycle-time-chart",
  templateUrl: `./cycle-time-chart.component.html`,
})
export class CycleTimeChartComponent implements OnInit {
  @Input() public data: any;

  constructor(
    public reportService: ReportService,
    private cycleTimesService: CycleTimeService
  ) {}

  ngOnInit(): void {
    this.getData();
  }

  public barChartLegend = true;
  public barChartType: ChartType = "bar";

  dateFrom = "2024-10-01";
  dateTo = "2024-11-11";

  chartData;

  barChartData: any = [
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
  dataTable;
  public barChartLabels: any[] = [];
  async getData() {
    let cycleTimeChart = await this.cycleTimesService.cycleTimeChart();
    this.dataTable = cycleTimeChart.allData;

    this.barChartData[0].data = cycleTimeChart.chart.headCount;
    // this.barChartData[1].data = this.data.totalHrsOverdueArray;
    this.barChartData[2].data = cycleTimeChart.chart.values;
    this.barChartData[2].backgroundColor = cycleTimeChart.chart.colors;
    this.barChartData[2].hoverBackgroundColor = cycleTimeChart.chart.colors;
    this.barChartLabels = cycleTimeChart.chart.label;

    let data = await this.cycleTimesService.getCycleTimes();
    // this.data = data.chart;

    // this.barChartData[0].data = this.data.weeklyUsers;
    // this.barChartData[1].data = this.data.totalHrsOverdueArray;
    // this.barChartData[2].data = this.data.values;
    // this.barChartData[2].backgroundColor = this.data.colors;
    // this.barChartData[2].hoverBackgroundColor = this.data.colors;
    // this.barChartLabels = this.data.label;
  }

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  getDataByDate = async (dateFrom, dateTo) => {
    let data = await this.cycleTimesService.getCycleTimesDaily(
      dateFrom,
      dateTo
    );
    this.data = data.chart;

    this.barChartData[0].data = this.data.weeklyUsers;
    this.barChartData[1].data = this.data.totalHrsOverdueArray;
    this.barChartData[2].data = this.data.values;
    this.barChartData[2].backgroundColor = this.data.colors;
    this.barChartData[2].hoverBackgroundColor = this.data.colors;
    this.barChartLabels = this.data.label;
  };

  public barChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    hover: {
      //   onHover: function (e: any) {
      //     var point = this.getElementAtEvent(e);
      //     if (point.length) e.target.style.cursor = "pointer";
      //     else e.target.style.cursor = "default";
      //   },
    },
    onClick: (c, i) => {
      let e: any = i[0];
      var x_value = this.data.label[e.index];
      const myArr = x_value.split(" ");
      this.dateFrom = moment(myArr[0]).format("YYYY-MM-DD");
      this.dateTo = moment(myArr[2]).format("YYYY-MM-DD");
      this.getDataByDate(this.dateFrom, this.dateTo);
    },
    scales: {
      x: {
        // scaleLabel: {
        //   display: true,
        //   labelString: "Total Hours by Week",
        //   fontColor: isDarkTheme() ? "white" : "black",
        // },
        // gridLines: {
        //   display: false,
        // },
        display: true,
        stacked: true,
        ticks: {
          stepSize: 1,
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
          maxTicksLimit: 10,
          // callback: (value: any, index, values) => {
          //     return value
          // //   const myArr = value?.split(" ");
          // //   if (myArr.length > 1) {
          // //     if (value == "Past Due") {
          // //       return "Total Past Due";
          // //     } else {
          // //       var weeknumber = moment(myArr[0], "MM-DD-YYYY").isoWeek();
          // //       return [
          // //         `${moment(myArr[0], "M/D/YYYY").format("M/D/YY")} - ${moment(
          // //           myArr[2],
          // //           "M/D/YYYY"
          // //         ).format("M/D/YY")}`,
          // //         `(WW${weeknumber})`,
          // //       ];
          // //     }
          // //   } else {
          // //     return value;
          // //   }
          // },
        },
      },
      y: {
        // scaleLabel: {
        //   display: true,
        //   labelString: "Total Hours",
        //   fontColor: isDarkTheme() ? "white" : "black",
        // },
        // gridLines: {
        //   color: isDarkTheme() ? "rgba(255,255,255,0.1)" : "#F0F0F0",
        // },

        stacked: true,
        ticks: {
          callback: function (value: any, index, values) {
            return nFormatter(value, 2);
          },
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: `Estimated Cycle Times`,
      },
      tooltip: {
        enabled: true,
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (tooltipItem) {
            var corporation = tooltipItem.dataset.label;
            let value: any;
            value = tooltipItem.raw;
            return `${corporation} ${value?.toFixed(2) || 0}`;
          },
        },
      },

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
        // formatter: (c, i) => {
        //   if (i.dataIndex == 0) {
        //     return (c + this.data.totalHrsOverdueArray[0]).toFixed(2) + " Hrs";
        //   }
        //   return c.toFixed(2) + " Hrs";
        // },
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
    // legend: {
    //   display: true,
    //   position: "top",
    //   labels: {
    //     fontColor: isDarkTheme() ? "white" : "black",
    //     fontSize: 12,
    //   },
    // },
  };
  public barChartPlugins = [ChartDataLabels];

  ///

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
