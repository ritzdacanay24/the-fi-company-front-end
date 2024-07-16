import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from "@angular/core";
import { AgGridModule } from "ag-grid-angular";
import { SharedModule } from "@app/shared/shared.module";
import { LoadingComponent } from "@app/shared/loading/loading.component";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";
import { CommentsModalService } from "../comments/comments-modal.service";
import { GridApi, GridOptions } from "ag-grid-community";
import { WorkOrderInfoService } from "@app/core/api/work-order/work-order-info.service";
import { currencyFormatter } from "src/assets/js/util";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, LoadingComponent, SoSearchComponent],
  selector: "app-wo-lookup",
  templateUrl: `./wo-lookup.component.html`,
  styleUrls: [],
})
export class WoLookupComponent {
  transactions: any = [];
  loadingIndicatorTransactions: boolean;

  constructor(
    private workOrderInfoService: WorkOrderInfoService,
    private commentsModalService: CommentsModalService
  ) {}

  @Input() public wo_nbr: string = "";
  @Output() setData: EventEmitter<any> = new EventEmitter();
  @Output() isLoadingEmitter: EventEmitter<any> = new EventEmitter();
  @Output() hasDataEmitter: EventEmitter<any> = new EventEmitter();

  @Input() comment = null;

  async notifyParent($event) {
    this.wo_nbr = $event.sod_nbr;
    this.getData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["wo_nbr"]) {
      this.wo_nbr = changes["wo_nbr"].currentValue;
      if (this.wo_nbr) this.getData();
    }

    if (changes["comment"] && changes["comment"].currentValue) {
      this.viewComment(changes["comment"].currentValue, null);
      this.wo_nbr = changes["comment"].currentValue.split("-")[0];
      this.getData();
    }
  }

  data: any = {
    main: {},
    details: [],
    routing: [],
  };
  isLoading = false;

  columnDefs: any = [
    { field: "wod_part", headerName: "Part #", filter: "agTextColumnFilter" },
    {
      field: "wod_iss_date",
      headerName: "Issued Date",
      filter: "agTextColumnFilter",
    },
    { field: "wod_op", headerName: "OP", filter: "agTextColumnFilter" },
    { field: "wod_loc", headerName: "Location", filter: "agTextColumnFilter" },
    {
      field: "wod_qty_req",
      headerName: "Qty Required",
      filter: "agTextColumnFilter",
      cellClass: (params) => {
        return params.value === 0 ? "text-danger" : "";
      },
    },
    {
      field: "wod_qty_pick",
      headerName: "Qty Picked",
      filter: "agTextColumnFilter",
    },
    {
      field: "wod_qty_iss",
      headerName: "Qty Issued",
      filter: "agTextColumnFilter",
    },
    { field: "wod_serial", headerName: "Serial", filter: "agTextColumnFilter" },
    {
      field: "wod_tot_std",
      headerName: "Total Standard",
      filter: "agTextColumnFilter",
      valueFormatter: currencyFormatter,
    },
    {
      field: "PERCENT",
      headerName: "% Complete",
      filter: "agTextColumnFilter",
      pinned: "right",
      cellClass: (params) => {
        if (params.value === "100.00") {
          return ["bg-success-subtle text-success"];
        }
        return null;
      },
      valueFormatter: (params) => {
        return params.data?.wod_qty_req > 0
          ? (
              (params.data?.wod_qty_iss / params.data?.wod_qty_req) *
              100
            ).toFixed(2) + "%"
          : "0.00%";
      },
      valueGetter: (params) => {
        return params.data?.wod_qty_req > 0
          ? (
              (params.data?.wod_qty_iss / params.data?.wod_qty_req) *
              100
            ).toFixed(2)
          : 0;
      },
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
    onFirstDataRendered: (params) => {},
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
    { field: "wr_part", headerName: "Part #", filter: "agTextColumnFilter" },
    {
      field: "wr_desc",
      headerName: "Routing Description",
      filter: "agTextColumnFilter",
    },
    { field: "wr_due", headerName: "Due Date", filter: "agTextColumnFilter" },
    { field: "wr_op", headerName: "Operation", filter: "agTextColumnFilter" },
    {
      field: "wr_qty_ord",
      headerName: "Qty Ordered",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_qty_comp",
      headerName: "Qty Completed",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_qty_move",
      headerName: "Qty Moved",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_qty_outque",
      headerName: "Qty Out Que",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_qty_wip",
      headerName: "Qty WIP",
      filter: "agTextColumnFilter",
    },
    {
      field: "wr_qty_inque",
      headerName: "Qty Inque",
      filter: "agTextColumnFilter",
    }, //represent the current queue
    { field: "wr_start", headerName: "Start", filter: "agTextColumnFilter" },
    { field: "wr_status", headerName: "Status", filter: "agTextColumnFilter" },
    {
      field: "wr_wkctr",
      headerName: "Work Center",
      filter: "agTextColumnFilter",
    },
    { field: "wr_queue", headerName: "Queue", filter: "agTextColumnFilter" },
  ];

  gridApi1: GridApi;

  gridOptions1: GridOptions = {
    columnDefs: this.columnDefs1,
    onFirstDataRendered: (params) => {},
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

  getData = () => {
    this.isLoading = true;
    this.isLoadingEmitter.emit(this.isLoading);
    this.workOrderInfoService.getSalesOrderNumberDetails(this.wo_nbr).subscribe(
      (data: any) => {
        this.data = data;

        this.isLoading = false;
        this.isLoadingEmitter.emit(this.isLoading);
        this.hasDataEmitter.emit(this.data?.main?.SO_NBR !== "");

        this.data.lineOverall =
          this.data.main.wo_qty_ord > 0
            ? (
                (this.data.main.wo_qty_comp / this.data.main.wo_qty_ord) *
                100
              ).toFixed(2)
            : 0;
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
