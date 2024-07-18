import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from "@angular/core";
import { SalesOrderInfoService } from "@app/core/api/sales-order/sales-order-info.service";
import { AgGridModule } from "ag-grid-angular";
import { SharedModule } from "@app/shared/shared.module";
import { LoadingComponent } from "@app/shared/loading/loading.component";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";
import { CommentsRendererComponent } from "@app/shared/ag-grid/comments-renderer/comments-renderer.component";
import { CommentsModalService } from "../comments/comments-modal.service";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, LoadingComponent, SoSearchComponent],
  selector: "app-order-lookup",
  templateUrl: `./order-lookup.component.html`,
  styleUrls: [],
})
export class OrderLookupComponent {
  transactions: any = [];
  loadingIndicatorTransactions: boolean;

  constructor(
    private salesOrderInfoService: SalesOrderInfoService,
    private commentsModalService: CommentsModalService
  ) {}

  @Input() public salesOrderNumber: string = "";
  @Output() setData: EventEmitter<any> = new EventEmitter();
  @Output() isLoadingEmitter: EventEmitter<any> = new EventEmitter();
  @Output() hasDataEmitter: EventEmitter<any> = new EventEmitter();

  @Input() comment = null;

  async notifyParent($event) {
    this.salesOrderNumber = $event.sod_nbr;
    this.getData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["salesOrderNumber"]) {
      this.salesOrderNumber = changes["salesOrderNumber"].currentValue;
      if (this.salesOrderNumber) this.getData();
    }

    if (changes["comment"] && changes["comment"].currentValue) {
      this.viewComment(changes["comment"].currentValue, null);
      this.salesOrderNumber = changes["comment"].currentValue.split("-")[0];
      this.getData();
    }
  }

  data: any = {
    address: {},
    main: {},
    mainDetails: [],
    ship: [],
    trans: [],
  };
  isLoading = false;

  columnDefs: ColDef[] = [
    { field: "sod_part", headerName: "Part #", filter: "agTextColumnFilter" },
    {
      field: "sod_custpart",
      headerName: "Customer Part",
      filter: "agTextColumnFilter",
    },
    {
      field: "sod_due_date",
      headerName: "Due Date",
      filter: "agTextColumnFilter",
    },
    { field: "sod_line", headerName: "Line #", filter: "agTextColumnFilter" },
    {
      field: "sod_order_category",
      headerName: "CO #",
      filter: "agTextColumnFilter",
    },
    {
      field: "sod_contr_id",
      headerName: "Customer PO #",
      filter: "agTextColumnFilter",
    },
    {
      field: "sod_qty_ord",
      headerName: "Ordered",
      filter: "agTextColumnFilter",
    },
    {
      field: "sod_qty_all",
      headerName: "Allocated",
      filter: "agTextColumnFilter",
    },
    {
      field: "sod_qty_pick",
      headerName: "Picked",
      filter: "agTextColumnFilter",
    },
    {
      field: "sod_qty_ship",
      headerName: "Shipped",
      filter: "agTextColumnFilter",
    },
    {
      field: "ABS_SHP_DATE",
      headerName: "Shipped Date",
      filter: "agTextColumnFilter",
    },
    { field: "SHORT", headerName: "Qty Short", filter: "agTextColumnFilter" },
    {
      field: "PERCENT",
      headerName: "% Complete",
      filter: "agTextColumnFilter",
      pinned: "right",
      valueFormatter: this.formatNumber.bind(this),
      cellClass: (params) => {
        if (params.value === 100) {
          return ["bg-success-subtle text-success"];
        }
        return null;
      },
    },
    {
      field: "recent_comments.comments_html",
      headerName: "Recent Comment",
      filter: "agTextColumnFilter",
      maxWidth: 300,
      tooltipValueGetter: (params) => params.value,
    },
    {
      field: "add_comments",
      headerName: "Comments",
      filter: "agSetColumnFilter",
      cellRenderer: CommentsRendererComponent,
      cellRendererParams: {
        onClick: (params: any) =>
          this.viewComment(
            params.rowData.sod_nbr + "-" + params.rowData.sod_line,
            params.rowData.id,
            params.rowData.sod_nbr
          ),
      },
    },
    {
      field: "CMT_CMMT",
      headerName: "QAD Comment",
      filter: "agTextColumnFilter",
    },
  ];

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
      () => {}
    );
  };

  gridApi: GridApi;

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params) => {
      this.gridApi = params.api;
      params.api.updateGridOptions({
        defaultColDef: {
          floatingFilter: false,
        },
      });
    },
    sideBar: false,
  };

  print() {
    setTimeout(() => {
      var printContents = document.getElementById("print").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();
      popupWin.document.write(`
      <html>
        <head>
          <title>Work Order Info</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
          <style>
            @page {
              size: A3 portrait;
            }
            .table{
              font-size:12px
            }
            .col-print-1 {width:8%;  float:left;}
            .col-print-2 {width:16%; float:left;}
            .col-print-3 {width:25%; float:left;}
            .col-print-4 {width:33%; float:left;}
            .col-print-5 {width:42%; float:left;}
            .col-print-6 {width:50%; float:left;}
            .col-print-7 {width:58%; float:left;}
            .col-print-8 {width:66%; float:left;}
            .col-print-9 {width:75%; float:left;}
            .col-print-10{width:83%; float:left;}
            .col-print-11{width:92%; float:left;}
            .col-print-12{width:100%; float:left;}
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>
      </html>`);
      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  }

  formatNumber(row) {
    // this puts commas into the number eg 1000 goes to 1,000,
    // i pulled this from stack overflow, i have no idea how it works
    if (!row.value) {
      return "0.00 %";
    }

    return row.value.toFixed(2) + "%";
  }

  /**
   * Shipped Details
   */

  columnDefs1 = [
    {
      field: "abs_shipto",
      headerName: "Ship To",
      filter: "agTextColumnFilter",
    },
    {
      field: "abs_shp_date",
      headerName: "Ship Date",
      filter: "agTextColumnFilter",
    },
    { field: "abs_item", headerName: "Part #", filter: "agTextColumnFilter" },
    { field: "abs_line", headerName: "Line", filter: "agTextColumnFilter" },
    {
      field: "abs_ship_qty",
      headerName: "Ship Qty",
      filter: "agTextColumnFilter",
    },
    { field: "abs_inv_nbr", headerName: "Inv #", filter: "agTextColumnFilter" },
    {
      field: "abs_par_id",
      headerName: "Packing Slip #",
      filter: "agTextColumnFilter",
    },
  ];

  gridApi1: any;

  gridOptions1 = {
    columnDefs: this.columnDefs1,
    onGridReady: (params) => {
      this.gridApi1 = params.api;
      params.api.updateGridOptions({
        defaultColDef: {
          floatingFilter: false,
        },
      });
    },
    sideBar: false,
  };

  /**
   * Trans Details
   */

  columnDefs2 = [
    {
      field: "tr_date",
      headerName: "Transaction Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "tr_per_date",
      headerName: "Performance Date",
      filter: "agTextColumnFilter",
    },
    { field: "tr_time", headerName: "Time", filter: "agTextColumnFilter" },
    {
      field: "tr_nbr",
      headerName: "Transaction #",
      filter: "agTextColumnFilter",
    },
    { field: "tr_type", headerName: "Type", filter: "agTextColumnFilter" },
    {
      field: "tr_part",
      headerName: "Part #",
      filter: "agTextColumnFilter",
    },
    {
      field: "tr_qty_loc",
      headerName: "Qty Changed Location",
      filter: "agTextColumnFilter",
    },
    { field: "tr_rmks", headerName: "Remarks", filter: "agTextColumnFilter" },
    {
      field: "tr_ship_id",
      headerName: "Packing Slip",
      filter: "agTextColumnFilter",
    },
    {
      field: "tr_qty_chg",
      headerName: "Qty Changed",
      filter: "agTextColumnFilter",
    },
    {
      field: "tr_qty_req",
      headerName: "Qty Required",
      filter: "agTextColumnFilter",
    },
    { field: "tr_userid", headerName: "User", filter: "agTextColumnFilter" },
  ];

  gridApi2: any;

  gridOptions2 = {
    columnDefs: this.columnDefs2,
    onGridReady: (params) => {
      this.gridApi2 = params.api;
      params.api.updateGridOptions({
        defaultColDef: {
          floatingFilter: false,
        },
      });
    },
    sideBar: false,
  };

  getTransactions() {
    this.loadingIndicatorTransactions = true;
    this.salesOrderInfoService.getTransactions(this.salesOrderNumber).subscribe(
      (data: any) => {
        this.transactions = data;
        this.loadingIndicatorTransactions = false;
      },
      (error) => {
        this.loadingIndicatorTransactions = false;
      }
    );
  }

  getData = () => {
    this.isLoading = true;
    this.isLoadingEmitter.emit(this.isLoading);
    this.salesOrderInfoService
      .getSalesOrderNumberDetails(this.salesOrderNumber)
      .subscribe(
        (data: any) => {
          this.data = data;
          this.isLoading = false;
          this.isLoadingEmitter.emit(this.isLoading);
          this.hasDataEmitter.emit(this.data?.main?.SO_NBR !== "");
        },
        (error) => {
          this.isLoading = false;
          this.isLoadingEmitter.emit(this.isLoading);
        }
      );
  };
  ngOnInit() {
    this.setData.emit(this.getData);
  }

  dismiss() {}

  close() {}
}
