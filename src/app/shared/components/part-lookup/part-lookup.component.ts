import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ItemService } from "@app/core/api/operations/item/item.service";
import { SalesOrderInfoModalService } from "../sales-order-info-modal/sales-order-info-modal.component";
import { WorkOrderInfoModalService } from "@app/shared/components/work-order-info-modal/work-order-info-modal.component";
import { ColDef, ColGroupDef, GridApi, GridOptions } from "ag-grid-community";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-part-lookup",
  templateUrl: `./part-lookup.component.html`,
  styleUrls: [],
})
export class PartLookupComponent {
  poResults = [];
  woResults = [];
  locationDet = [];
  shortages = [];
  locationDetDesc = "";
  isLoading = false;
  itemInfo: any;

  @Output() setData: EventEmitter<any> = new EventEmitter();
  @Output() isLoadingEmitter: EventEmitter<any> = new EventEmitter();
  @Output() hasDataEmitter: EventEmitter<any> = new EventEmitter();
  @Output() getDataEmitter: EventEmitter<any> = new EventEmitter();

  notifyParent($event) {
    this.partNumber = $event.pt_nbr;
    this.getData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["partNumber"]) {
      this.partNumber = changes["partNumber"].currentValue;
      if (this.partNumber) this.getData();
    }
  }

  @Input() partNumber: string;

  locationcolumnDefs: ColDef[] = [
    { field: "LD_LOC", headerName: "Location", filter: "agTextColumnFilter" },
    {
      field: "LD_QTY_OH",
      headerName: "On Hand Qty",
      filter: "agTextColumnFilter",
    },
    {
      field: "LD_QTY_ALL",
      headerName: "Qty Allocated",
      filter: "agTextColumnFilter",
    },
    {
      field: "AVAILABLE",
      headerName: "Qty Available",
      filter: "agTextColumnFilter",
    },
    { field: "LD_LOT", headerName: "Lot/Serial", filter: "agTextColumnFilter" },
    { field: "LD_STATUS", headerName: "Status", filter: "agTextColumnFilter" },
  ];

  gridApi: GridApi;

  gridOptions: GridOptions = {
    columnDefs: this.locationcolumnDefs,
    onGridReady: (params) => {
      this.gridApi = params.api;
      params.api.updateGridOptions({
        defaultColDef: {
          floatingFilter: false,
          suppressHeaderFilterButton: true,
        },
      });
    },
    sideBar: false,
    domLayout: "autoHeight",
  };
  total: number;
  demand: any;
  totalDemand: number;
  workOrderSum: number;

  onGridReady(params) {
    this.gridApi = params.api;
  }

  purchaseOrdercolumnDefs: ColDef[] = [
    { field: "pod_nbr", headerName: "PO #", filter: "agTextColumnFilter" },
    {
      field: "po_ord_date",
      headerName: "Ordered Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "pod_due_date",
      headerName: "Due Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "po_shipvia",
      headerName: "Ship Via",
      filter: "agTextColumnFilter",
    },
    { field: "po_vend", headerName: "Vendor", filter: "agTextColumnFilter" },
    {
      field: "pod_qty_ord",
      headerName: "Ordered Qty",
      filter: "agTextColumnFilter",
    },
    { field: "po_rmks", headerName: "Remarks", filter: "agTextColumnFilter" },
    { field: "po_buyer", headerName: "Buyer", filter: "agTextColumnFilter" },
  ];

  gridApi2: GridApi;

  gridOptions2: GridOptions = {
    columnDefs: this.purchaseOrdercolumnDefs,
    onGridReady: this.onGridReady2.bind(this),
    sideBar: false,
    domLayout: "autoHeight",
    popupParent: document.querySelector("modal"),
  };

  onGridReady2(params) {
    this.gridApi2 = params.api;
    params.api.updateGridOptions({
      defaultColDef: {
        floatingFilter: false,
        suppressHeaderFilterButton: true,
      },
    });
  }

  workOrdercolumnDefs: ColDef[] = [
    { field: "WR_DUE", headerName: "Due Date", filter: "agTextColumnFilter" },
    {
      field: "WR_QTY_COMP",
      headerName: "Qty Completed",
      filter: "agTextColumnFilter",
    },
    {
      field: "WR_QTY_ORD",
      headerName: "Qty Ordered",
      filter: "agTextColumnFilter",
    },
    { field: "WR_STATUS", headerName: "Status", filter: "agTextColumnFilter" },
    {
      field: "wr_nbr",
      headerName: "Work Order #",
      filter: "agTextColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: ({ rowData }) =>
          this.workOrderInfoModalService.open(rowData.wr_nbr),
        isLink: true,
      },
    },
  ];

  gridApi3: GridApi;

  gridOptions3: GridOptions = {
    columnDefs: this.workOrdercolumnDefs,
    onGridReady: this.onGridReady3.bind(this),
    sideBar: false,
    domLayout: "autoHeight",
    popupParent: document.querySelector("modal"),
  };

  onGridReady3(params) {
    this.gridApi3 = params.api;
    params.api.updateGridOptions({
      defaultColDef: {
        floatingFilter: false,
        suppressHeaderFilterButton: true,
      },
    });
  }

  /**
   * Demand
   */
  demandcolumnDefs: ColDef[] = [
    {
      field: "sod_nbr",
      headerName: "SO #",
      filter: "agTextColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.salesOrderInfoModalService.open(e.rowData.sod_nbr),
        isLink: true,
      },
    },
    {
      field: "SOD_DUE_DATE",
      headerName: "Due Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "TOTALORDERED",
      headerName: "Ordered",
      filter: "agTextColumnFilter",
    },
    { field: "OPENBALANCE", headerName: "Open", filter: "agTextColumnFilter" },
    {
      field: "TOTALPICKED",
      headerName: "Picked",
      filter: "agTextColumnFilter",
    },
    {
      field: "TOTALSHIPPED",
      headerName: "Shipped",
      filter: "agTextColumnFilter",
    },
  ];

  gridApi4: GridApi;

  gridOptions4: GridOptions = {
    columnDefs: this.demandcolumnDefs,
    onGridReady: this.onGridReady4.bind(this),
    sideBar: false,
    popupParent: document.querySelector("modal"),
  };

  onGridReady4(params) {
    this.gridApi4 = params.api;
    params.api.updateGridOptions({
      defaultColDef: {
        floatingFilter: false,
        suppressHeaderFilterButton: true,
      },
    });
  }

  /**
   * Shortages
   */

  shortagescolumnDefs: (ColDef | ColGroupDef)[] = [
    {
      headerName: "Shortage Info",
      children: [
        {
          field: "assemblyNumber",
          headerName: "Assembly #",
          filter: "agTextColumnFilter",
        },
        {
          field: "partNumber",
          headerName: "Short Item",
          filter: "agTextColumnFilter",
        },
        {
          field: "woNumber",
          headerName: "WO #",
          filter: "agTextColumnFilter",
        },
        { field: "qty", headerName: "Qty", filter: "agTextColumnFilter" },
        { field: "poNumber", headerName: "PO #", filter: "agTextColumnFilter" },
        {
          field: "createdDate",
          headerName: "Created Date",
          filter: "agTextColumnFilter",
        },
      ],
    },
    {
      headerName: "Extra Info",
      children: [
        {
          field: "fullName",
          headerName: "Created By",
          filter: "agTextColumnFilter",
        },
        {
          field: "id",
          headerName: "Id",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "dueDate",
          headerName: "Due Date",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "lineNumber",
          headerName: "line #",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "reasonPartNeeded",
          headerName: "Reason",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "supplyCompleted",
          headerName: "Supply Completed",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "deliveredCompleted",
          headerName: "Delivered Completed",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "receivingCompleted",
          headerName: "Receiving Completed",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "productionIssuedDate",
          headerName: "Production Issued Completed",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "mrfId",
          headerName: "MR #",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
        {
          field: "mrf_line",
          headerName: "MR Line #",
          filter: "agTextColumnFilter",
          columnGroupShow: "open",
        },
      ],
    },
  ];

  gridApi5: GridApi;

  gridOptions5: GridOptions = {
    columnDefs: this.shortagescolumnDefs,
    onGridReady: this.onGridReady5.bind(this),
    alwaysShowHorizontalScroll: true,
    sideBar: false,
    domLayout: "autoHeight",
    popupParent: document.querySelector("modal"),
  };

  onGridReady5(params) {
    this.gridApi5 = params.api;
    params.api.updateGridOptions({
      defaultColDef: {
        floatingFilter: false,
        suppressHeaderFilterButton: true,
      },
    });
  }

  constructor(
    private api: ItemService,
    public salesOrderInfoModalService: SalesOrderInfoModalService,
    private workOrderInfoModalService: WorkOrderInfoModalService
  ) {}

  @Input() public typeOfItemSearch: string;

  printLocationDetails() {
    setTimeout(() => {
      var printContents = document.getElementById("print").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();

      popupWin.document.write(`
        <html>
          <head>
            <title>Material Request Picking</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <style>          
            @page {
              size: portrait;
            }
            </style>
          </head>
          <body onload="window.print();window.close()">${printContents}</body>
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

  isItemNumberInvalid() {
    return this.partNumber === "" || this.partNumber === undefined;
  }

  sumLocationDetails() {
    let total = 0;
    for (let i = 0; i < this.locationDet.length; i++) {
      total = total + this.locationDet[i].LD_QTY_OH;
    }
    return total;
  }

  orderDemandSum() {
    let total = 0;
    for (let i = 0; i < this.demand.length; i++) {
      total += this.demand[i].OPENBALANCE;
    }
    return total;
  }

  workOrderDemandSum() {
    let total = 0;
    for (let i = 0; i < this.woResults.length; i++) {
      total += this.woResults[i].WR_QTY_ORD;
    }
    return total;
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.isLoadingEmitter.emit(this.isLoading);
      let data = await this.api.getItemInfo(this.partNumber);
      this.locationDet = data.locationDet;
      this.poResults = data.POresults;
      this.woResults = data.WOresults;
      this.locationDetDesc = data.locationDetDesc;
      this.itemInfo = data.itemInfo;
      this.demand = data.orderDemand;
      this.shortages = data.openShortages;
      this.isLoading = false;
      this.total = this.sumLocationDetails();
      this.totalDemand = this.orderDemandSum();
      this.workOrderSum = this.workOrderDemandSum();
      this.isLoading = false;
      this.isLoadingEmitter.emit(this.isLoading);
      this.hasDataEmitter.emit(data.itemInfo);
    } catch (err) {
      this.isLoading = false;
      this.isLoadingEmitter.emit(this.isLoading);
    }
  };
  ngOnInit() {
    if (this.isItemNumberInvalid()) {
      this.dismiss();
    } else {
      this.getData();
      this.setData.emit(this.getData);
    }

    this.getDataEmitter.emit(this.getData);
  }

  public dismiss() {}

  public close() {}
}
