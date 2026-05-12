import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ReportService } from "@app/core/api/operations/report/report.service";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import moment from "moment";
import { currencyFormatter, autoSizeColumns } from "src/assets/js/util";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { SalesOrderInfoModalService } from "@app/shared/components/sales-order-info-modal/sales-order-info-modal.component";
import { ShippedOrdersChartComponent } from "./shipped-orders-chart/shipped-orders-chart.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    DateRangeComponent,
    GridSettingsComponent,
    GridFiltersComponent,
    ShippedOrdersChartComponent,
  ],
  selector: "app-shipped-orders-report",
  templateUrl: "./shipped-orders-report.component.html",
  styleUrls: [],
})
export class ShippedOrdersReportComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public reportService: ReportService,
    private itemInfoModalService: ItemInfoModalService,
    private salesOrderInfoModalService: SalesOrderInfoModalService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];
      this.showChart = String(params["showChart"] || "false").toLowerCase() === "true";

      if (this.showChart && !this.dataChart) {
        this.getChartData();
      }
    });

    this.getData();
  }

  pageId = "/pulse/shipped-orders";

  searchName = "";

  onFilterTextBoxChanged(value: any) {
    //setQuickFilter
    this.gridApi.setGridOption("quickFilterText", value);
  }

  title = "Shipped Orders Report";
  showChart = false;

  dateFrom = moment().format("YYYY-MM-DD");
  dateTo = moment().format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  gridApi: GridApi;

  data: any[];

  columnDefs: ColDef[] = [
    { field: "status", headerName: "Status" },
    {
      field: "sod_part",
      headerName: "Part",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.itemInfoModalService.open(e.rowData.sod_part),
        isLink: true,
      },
    },
    { field: "fulldesc", headerName: "Desc", filter: "agMultiColumnFilter" },
    {
      field: "cp_cust_part",
      headerName: "Cust Part #",
      filter: "agMultiColumnFilter",
    },
    {
      field: "sod_nbr",
      headerName: "SO #",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.salesOrderInfoModalService.open(e.rowData.sod_nbr),
        isLink: true,
      },
    },
    { field: "sod_line", headerName: "Line #", filter: "agSetColumnFilter" },
    {
      field: "sod_contr_id",
      headerName: "PO #",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    { field: "so_cust", headerName: "Cust", filter: "agMultiColumnFilter" },
    { field: "so_ship", headerName: "Ship To", filter: "agMultiColumnFilter" },
    {
      field: "sod_qty_ord",
      headerName: "Qty Ordered",
      filter: "agMultiColumnFilter",
    },
    {
      field: "sod_qty_ship",
      headerName: "Qty Shipped",
      filter: "agMultiColumnFilter",
    },
    {
      field: "sod_due_date",
      headerName: "Due Date",
      filter: "agSetColumnFilter",
    },
    {
      field: "sod_domain",
      headerName: "Domain",
      filter: "agSetColumnFilter",
    },
    {
      field: "sod_compl_stat",
      headerName: "Completion Status",
      filter: "agMultiColumnFilter",
    },
    {
      field: "sod_order_category",
      headerName: "Customer CO #",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "so_ord_date",
      headerName: "Ordered Date",
      filter: "agSetColumnFilter",
    },
    {
      field: "so_bol",
      headerName: "BOL",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_shp_date",
      headerName: "Shipped On",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_item",
      headerName: "ABS Item",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_line",
      headerName: "ABS Line",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_ship_qty",
      headerName: "Qty Shipped (ABS)",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_inv_nbr",
      headerName: "Inv #",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_par_id",
      headerName: "Shipper",
      filter: "agMultiColumnFilter",
    },
    {
      field: "abs_order",
      headerName: "ABS Order",
      filter: "agMultiColumnFilter",
    },
    {
      field: "sod_list_pr",
      headerName: "List Price",
      filter: "agMultiColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "sod_price",
      headerName: "SOD Price",
      filter: "agMultiColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "ext",
      headerName: "Extended Amount",
      filter: "agMultiColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "sod_acct",
      headerName: "SOD Account",
      filter: "agSetColumnFilter",
    },
    { field: "sod_type", headerName: "Type", filter: "agMultiColumnFilter" },
    { field: "so_rmks", headerName: "Remarks", filter: "agMultiColumnFilter" },
  ];

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      autoSizeColumns(params);
    },
    onFilterChanged: (params) => this.updateUrl(params),
    onSortChanged: (params) => this.updateUrl(params),
  };

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api);
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridParams,
      },
    });
  };

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      let data: any = await this.reportService.getShippedOrdersReport(
        this.dateFrom,
        this.dateTo
      );
      const rows = data ? data : [];
      this.data = this.normalizeGridRows(rows);
      this.router.navigate(["."], {
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
        },
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
      });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  typeOfView = "Daily";
  isLoading = false;
  dataChart;
  showCustomers = "Show All";

  dateFrom1 = moment()
    .subtract(1, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo1 = moment().add(7, "days").endOf("month").format("YYYY-MM-DD");
  dateRange1 = [this.dateFrom1, this.dateTo1];

  onChangeDate1($event) {
    this.dateFrom1 = $event["dateFrom"];
    this.dateTo1 = $event["dateTo"];
    this.getChartData();
  }

  toggleChartView(showChart: boolean) {
    this.showChart = showChart;

    this.router.navigate(["."], {
      queryParams: {
        showChart: showChart ? "true" : "false",
      },
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });

    if (showChart && !this.dataChart) {
      this.getChartData();
    }
  }

  async getChartData() {
    // var a = moment(this.dateFrom1);
    // var b = moment(this.dateTo1);
    // if (b.diff(a, 'days') > 120 && this.typeOfView == 'Daily') {
    //   alert('Daily view range cannot be larger than 120 days.')
    //   return
    // }

    this.isLoading = true;
    let data = await this.reportService.getShippedOrdersChart(
      this.dateFrom1,
      this.dateTo1,
      this.typeOfView,
      this.showCustomers
    );
    this.dataChart = this.normalizeChartPayload(data);
    this.isLoading = false;
  }

  private normalizeGridRows(rows: any[]): any[] {
    return rows || [];
  }

  private normalizeChartPayload(payload: any): any {
    if (!payload) {
      return payload;
    }

    if (payload.chartnew) {
      return payload;
    }

    const labels: string[] = payload?.obj?.label || [];
    const totalCost: number[] = payload?.chart?.totalCost || [];
    const backgroundColor: string[] = payload?.chart?.backgroundColor || [];
    const goalLine: number[] = payload?.chart?.goalLine || labels.map(() => 200000);

    return {
      ...payload,
      chartnew: {
        shipped_value: {
          label: 'Shipped Value',
          dataset: totalCost,
          backgroundColor,
          type: 'bar',
        },
        target_goal: {
          label: 'Goal',
          dataset: goalLine,
          backgroundColor: '#cc0000',
          type: 'line',
        },
      },
    };
  }
}
