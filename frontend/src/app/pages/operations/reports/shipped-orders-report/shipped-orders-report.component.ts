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
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { SalesOrderInfoModalService } from "@app/shared/components/sales-order-info-modal/sales-order-info-modal.component";
import { FgLabelPrintModalService } from "@app/shared/components/fg-label-print-modal/fg-label-print-modal.component";
import { ShippedOrdersChartComponent } from "./shipped-orders-chart/shipped-orders-chart.component";
import { PartsOrderModalService } from "@app/pages/field-service/parts-order/parts-order-modal/parts-order-modal.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { IconRendererV2Component } from "@app/shared/ag-grid/icon-renderer-v2/icon-renderer-v2.component";
import { CommentsRendererV2Component } from "@app/shared/ag-grid/comments-renderer-v2/comments-renderer-v2.component";

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
    private commentsModalService: CommentsModalService,
    private itemInfoModalService: ItemInfoModalService,
    private salesOrderInfoModalService: SalesOrderInfoModalService,
    private fgLabelPrintModal: FgLabelPrintModalService,
    private partsOrderModalService: PartsOrderModalService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];
      this.comment = params["comment"];
      this.showChart = String(params["showChart"] || "false").toLowerCase() === "true";

      if (this.showChart && !this.dataChart) {
        this.getChartData();
      }
    });

    this.getData();

    if (this.comment) {
      this.viewComment(this.comment, null);
    }
  }

  comment;

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

  viewComment = (salesOrderLineNumber: any, id: string, so?) => {
    let modalRef = this.commentsModalService.open(
      salesOrderLineNumber,
      "Sales Order"
    );
    modalRef.result.then(
      (result: any) => {
        let rowNode = this.gridApi.getRowNode(id);
        rowNode.data.recent_comments = result;
        this.gridApi.redrawRows({ rowNodes: [rowNode] });
      },
      () => { }
    );
  };

  gridApi: GridApi;

  data: any[];

  columnDefs: ColDef[] = [
    { field: "STATUS", headerName: "Status" },
    {
      field: "SOD_PART",
      headerName: "Part",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.itemInfoModalService.open(e.rowData.SOD_PART),
        isLink: true,
      },
    },
    { field: "FULLDESC", headerName: "Desc", filter: "agMultiColumnFilter" },
    {
      field: "CP_CUST_PART",
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
    { field: "SOD_LINE", headerName: "Line #", filter: "agSetColumnFilter" },
    {
      field: "SOD_CONTR_ID",
      headerName: "PO #",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    { field: "SO_CUST", headerName: "Cust", filter: "agMultiColumnFilter" },
    { field: "SO_SHIP", headerName: "Ship To", filter: "agMultiColumnFilter" },
    {
      field: "SOD_QTY_ORD",
      headerName: "Qty Ordered",
      filter: "agMultiColumnFilter",
    },
    {
      field: "SOD_QTY_SHIP",
      headerName: "Qty Shipped (MSTR)",
      filter: "agMultiColumnFilter",
    },
    { field: "QTYOPEN", headerName: "Qty Open", filter: "agMultiColumnFilter" },
    { field: "LD_QTY_OH", headerName: "Qty OH", filter: "agMultiColumnFilter" },
    {
      field: "SOD_DUE_DATE",
      headerName: "Due Date",
      filter: "agSetColumnFilter",
    },
    {
      field: "SOD_ORDER_CATEGORY",
      headerName: "Customer CO #",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "FG-Label",
      headerName: "FG Label",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.fgLabelPrintModal.open(
            e.rowData.CP_CUST_PART,
            e.rowData.SOD_CONTR_ID,
            e.rowData.SOD_PART,
            e.rowData.PT_DESC1,
            e.rowData.PT_DESC2,
            e.rowData
          );
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "SO_ORD_DATE",
      headerName: "Ordered Date",
      filter: "agSetColumnFilter",
    },
    { field: "PT_ROUTING", headerName: "Routing", filter: "agSetColumnFilter" },
    { field: "WORKORDERS", headerName: "WO #", filter: "agMultiColumnFilter" },
    {
      field: "add_comments",
      headerName: "Comments",
      filter: "agSetColumnFilter",
      cellRenderer: CommentsRendererV2Component,
      cellRendererParams: {
        onClick: (params: any) =>
          this.viewComment(
            params.rowData.sod_nbr + "-" + params.rowData.SOD_LINE,
            params.rowData.id,
            params.rowData.sod_nbr
          ),
      },
    },
    {
      field: "recent_comments.comments_html",
      headerName: "Recent Comment",
      filter: "agMultiColumnFilter",
      maxWidth: 300,
    },
    {
      field: "CMT_CMMT",
      headerName: "QAD Comments",
      filter: "agMultiColumnFilter",
    },
    { field: "OWNER", headerName: "Owner", filter: "agSetColumnFilter" },
    {
      field: "ABS_SHIP_QTY",
      headerName: "Qty Shipped",
      filter: "agMultiColumnFilter",
    },
    {
      field: "ABS_PAR_ID",
      headerName: "Shipper",
      filter: "agMultiColumnFilter",
    },
    {
      field: "ABS_SHP_DATE",
      headerName: "Shipped On",
      filter: "agMultiColumnFilter",
    },
    {
      field: "TRANSACTIONTIME",
      headerName: "Transaction Time",
      filter: "agMultiColumnFilter",
    },
    { field: "ABS_INV_NBR", headerName: "Inv #", filter: "agMultiColumnFilter" },
    {
      field: "SOD_LIST_PR",
      headerName: "SOD List Price",
      filter: "agMultiColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "SOD_PRICE",
      headerName: "SOD Price",
      filter: "agMultiColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "EXT",
      headerName: "Extended Amount",
      filter: "agMultiColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "sod_acct",
      headerName: "SOD Account",
      filter: "agSetColumnFilter",
    },
    {
      field: "shipViaAccount",
      headerName: "Ship Via Account",
      filter: "agSetColumnFilter",
    },
    {
      field: "arrivalDate",
      headerName: "Arrival Date",
      filter: "agMultiColumnFilter",
    },
    { field: "sod_type", headerName: "Type", filter: "agMultiColumnFilter" },
    { field: "SO_RMKS", headerName: "Remarks", filter: "agMultiColumnFilter" },
    {
      field: "VIEW_PARTS_ORDER_REQUEST",
      headerName: "View Parts Order Request",
      filter: "agMultiColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.viewPartsOrder(e.rowData.sod_nbr),
        iconName: "mdi mdi-ballot-outline",
      },
    },
    { field: "tj_po_number", headerName: "TJ PO #", filter: "agMultiColumnFilter" },
  ];

  viewPartsOrder = (so_number_and_line) => {
    let modalRef = this.partsOrderModalService.open(so_number_and_line);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

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
    return (rows || []).map((row) => {
      const normalized: Record<string, any> = { ...row };
      for (const key of Object.keys(row || {})) {
        normalized[key.toUpperCase()] = row[key];
        normalized[key.toLowerCase()] = row[key];
      }
      return normalized;
    });
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
