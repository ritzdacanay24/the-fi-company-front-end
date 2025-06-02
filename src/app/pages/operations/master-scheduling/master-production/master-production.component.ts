import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { NgSelectModule } from "@ng-select/ng-select";
import { WorkOrderPickSheetModalService } from "../work-order-pick-sheet-modal/work-order-pick-sheet-modal.component";
import { WorkOrderInfoModalService } from "@app/shared/components/work-order-info-modal/work-order-info-modal.component";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";
import { LateReasonCodeModalService } from "@app/shared/components/last-reason-code-modal/late-reason-code-modal.component";
import {
  agGridDateFilterdateFilter,
  highlightRowView,
  isEmpty,
} from "src/assets/js/util";
import { MasterSchedulingService } from "@app/core/api/operations/master-scheduling/master-scheduling.service";
import { KanbanAddModalService } from "@app/pages/operations/master-scheduling/work-order-tracker/work-order-tracker-add-modal/work-order-tracker-add-modal.component";
import { WebsocketService } from "@app/core/services/websocket.service";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { CommentsRendererV2Component } from "@app/shared/ag-grid/comments-renderer-v2/comments-renderer-v2.component";
import { LateReasonCodeRendererV2Component } from "@app/shared/ag-grid/cell-renderers/late-reason-code-renderer-v2/late-reason-code-renderer-v2.component";
import { PickSheetRendererV2Component } from "@app/shared/ag-grid/pick-sheet-renderer-v2/pick-sheet-renderer.component";

const MASTER_PRODUCTION = "MASTER_PRODUCTION";
const WORK_ORDER_ROUTING = "Work Order Routing";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
  ],
  selector: "app-master-production",
  templateUrl: "./master-production.component.html",
})
export class MasterProductionComponent implements OnInit {
  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
    private workOrderPickSheetModalService: WorkOrderPickSheetModalService,
    private workOrderInfoModalService: WorkOrderInfoModalService,
    private itemInfoModalService: ItemInfoModalService,
    private commentsModalService: CommentsModalService,
    private lateReasonCodeModalService: LateReasonCodeModalService,
    private api: MasterSchedulingService,
    private kanbanAddModalService: KanbanAddModalService,
    private websocketService: WebsocketService
  ) {
    this.websocketService = websocketService;

    //watch for changes if this modal is open
    //changes will only occur if modal is open and if the modal equals to the same qir number
    const ws_observable = this.websocketService.multiplex(
      () => ({ subscribe: MASTER_PRODUCTION }),
      () => ({ unsubscribe: MASTER_PRODUCTION }),
      (message) => message.type === MASTER_PRODUCTION
    );

    //if changes are found, patch new values
    ws_observable.subscribe((data: any) => {
      if (Array.isArray(data?.message)) {
        this.gridApi.applyTransaction({ update: data?.message });
        this.gridApi.redrawRows();
      } else {
        var rowNode = this.gridApi.getRowNode(data.message.id);
        this.gridApi.applyTransaction({ update: [data.message] });
        this.gridApi.redrawRows({ rowNodes: [rowNode] });

        this.refreshCells([rowNode]);
      }
    });
  }

  public refreshCells(rowNode) {
    this.gridApi.flashCells({
      rowNodes: rowNode,
      flashDelay: 3000,
      fadeDelay: 2000,
    });
  }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["data"]) {
      this.data = changes["data"].currentValue;
    }
  }

  @Output() setGridApi: EventEmitter<any> = new EventEmitter();
  @Output() setDataRenderered: EventEmitter<any> = new EventEmitter();
  @Input({ required: true }) routing;
  @Input({ required: true }) pageId;
  @Input({ required: true }) data: any;
  @Input({ required: true }) getData: Function;
  @Input({ required: false }) ngStyles: string | any =
    "height: calc(100vh - 170px)";

  gridApi: GridApi;

  id = null;

  title = "Master Production";

  public sendAndUpdate(newData: any, id: any) {
    /**
     * newData MUST be the complete data object
     */
    let rowNode = this.gridApi.getRowNode(id);
    rowNode.data = newData;
    this.gridApi.redrawRows({ rowNodes: [rowNode] });

    this.websocketService.next({
      message: newData,
      type: MASTER_PRODUCTION,
    });
  }

  openPickSheet = (workOrder) => {
    let modalRef = this.workOrderPickSheetModalService.open(workOrder);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  openWorkOrderInfo = (workOrder) => {
    let modalRef = this.workOrderInfoModalService.open(workOrder);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  openItemInfo = (workOrder) => {
    let modalRef = this.itemInfoModalService.open(workOrder);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewComment = (workOrderNumber, id: string) => {
    let modalRef = this.commentsModalService.open(
      workOrderNumber,
      "Work Order"
    );
    modalRef.result.then(
      (result: any) => {
        let rowNode = this.gridApi.getRowNode(id);
        rowNode.data.recent_comments = result;
        this.massUpdate(rowNode.data, workOrderNumber, true);
      },
      () => { }
    );
  };

  massUpdate(newData: any, uniqueId: number, ws = false) {
    let updatedData = [];
    this.gridApi.forEachNode(function (rowNode) {
      if (rowNode.data.WR_NBR == uniqueId) {
        rowNode.data.recent_comments = newData.recent_comments;
        rowNode.data.wedge_rework = newData.wedge_rework;
        rowNode.data.print_details = newData.print_details;
        rowNode.data.misc.shipping_db_status = newData.misc.shipping_db_status;
        updatedData.push(rowNode);
      }
    });

    this.gridApi.redrawRows({ rowNodes: updatedData });

    if (ws) {
      this.websocketService.next({
        message: newData,
        type: WORK_ORDER_ROUTING,
      });
    }
  }

  openReasonCodes = (key, misc, soLineNumber, rowData) => {
    let lateReasonCodeDepartment = "";
    if (rowData.WR_OP == 10) {
      lateReasonCodeDepartment = "Picking Report";
    } else if (rowData.WR_OP == 20) {
      lateReasonCodeDepartment = "Production Report";
    } else if (rowData.WR_OP == 30) {
      lateReasonCodeDepartment = "Final Test QC";
    }

    let modalRef = this.lateReasonCodeModalService.open(
      key,
      misc,
      soLineNumber,
      lateReasonCodeDepartment
    );
    modalRef.result.then(
      (result: any) => {
        this.getData();
      },
      () => { }
    );
  };

  pickingFilterParams = {
    valueGetter: ({ data }) => {
      if (isEmpty(data.print_details)) {
        return "Not printed";
      } else if (data.LINESTATUS == 0) {
        return "Completed Picks";
      } else if (data.LINESTATUS > 0) {
        return "Partially completed";
      } else if (data.LINESTATUS < 0) {
        return "Over issued";
      }
      return null;
    },
  };

  public async update(data: any) {
    data.shippingMisc = 1;
    data.so = data.WR_NBR; //add on insert since so is not available yet

    try {
      let res = await this.api.saveMisc(data);
    } catch (err) { }
  }

  addToWorkOrderTracker(data, wo_nbr) {
    let modalRef = this.kanbanAddModalService.open(null, wo_nbr);
    modalRef.result.then(
      (result: any) => {
        data.kanban_info.id = true;
        this.sendAndUpdate(data, data.SO);
      },
      () => { }
    );
  }


  public printCoverSheet(workOrder) {
    var popupWin = window.open("", "_blank", "width=900,height=800");
    popupWin.document.open();
    popupWin.document.write(`
      <html>

<head>
  <title>Work Order Cover Sheet</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css">
    <style>
      @page {
        size: A5 landscape;
        margin:auto !important;
      }

      @media print {
      
      @page {
        size: A5 landscape;
        margin:auto !important;
      }

        .header-name {
          background: gray !important;
          -webkit-print-color-adjust: exact;
          color: #fff !important;
          font-size: 20px !important;
          padding: 5px !important;
          text-align: center !important
        }

        .hide-print {
          display: none !important;
        }

        a:link {
          text-decoration: none;
          color: #000
        }

        td,
        th {
          padding: 0 6px
        }

        .light-grey {
          background-color: #E8E8E8 !important;
          -webkit-print-color-adjust: exact;
        }

        /* The heart of the matter */
        .testimonial-group>.row {
          overflow-x: auto;
          white-space: nowrap;
          display: block;
        }

        .testimonial-group>.row>.col-xs-4 {
          display: inline-block;
          float: none;
        }

        /* Decorations */
        .col-xs-4 {
          color: #fff;
          font-size: 15px;
          padding: 3px 10px;
          margin: 5px 1px
        }

        .col-xs-4:nth-child(1n+1) {
          background: lightskyblue;
        }

        .totalBill {
          padding-right: 25px !important;
          font-size: 25px !important
        }

      }
    </style>
</head>

<body onload="window.print();window.close()">
  <div style="text-align:center">
    <div style="font-size:100px;font-weight:bolder">Work Order</div>
    <p style="font-size:80px;font-weight:bolder">${workOrder}</p>

  </div>
</body>

</html>
`);

    popupWin.document.close();
  }

  columnDefs: ColDef[] = [
    // {
    //   field: "kanban_info.wo_nbr",
    //   headerName: "Add To WO Tracker",
    //   filter: "agSetColumnFilter",
    //   cellRenderer: KanbanRendererComponent,
    //   cellRendererParams: {
    //     onClick: (e) => this.addToWorkOrderTracker(e.rowData, e.rowData.WR_NBR),
    //     isLink: true,
    //     value: "Add",
    //   },
    // },
    {
      field: "WR_NBR",
      headerName: "Pick Sheet",
      filter: "agSetColumnFilter",
      cellRenderer: PickSheetRendererV2Component,
      cellRendererParams: {
        onClick: (params) => this.openPickSheet(params.rowData.WR_NBR),
        iconName: "mdi-clipboard-outline",
      },
      filterParams: this.pickingFilterParams,
    },
    {
      field: "WR_NBR",
      headerName: "Print Cover Sheet",
      filter: "agSetColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (params) => this.printCoverSheet(params.rowData.WR_NBR),
        isLink: true,
      },
      filterParams: this.pickingFilterParams,
    },
    {
      field: "status_info.status_text",
      headerName: "Status",
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => {
        if (params.data) {
          if (params.value == "Future Order")
            return `<span class="badge bg-success-subtle text-success">${params.value}</span>`;
          if (params.value == "Past Due")
            return `<span class="badge bg-danger-subtle text-danger">${params.value}</span>`;
          if (params.value == "Due Today")
            return `<span class="badge bg-warning-subtle text-warning">${params.value}</span>`;
          return params.value;
        }
        return null;
      },
    },
    {
      field: "WR_NBR",
      headerName: "Work #",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.openWorkOrderInfo(e.rowData.WR_NBR),
        isLink: true,
      },
    },
    {
      field: "Comments",
      headerName: "Comments",
      filter: "agMultiColumnFilter",
      cellRenderer: CommentsRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.viewComment(e.rowData.WR_NBR, e.rowData.SO),
      },
      valueGetter: function (params) {
        if (params.data)
          return {
            title: `WO#: ${params.data.WR_NBR}`,
            description: `${params.data.WR_PART}`,
          };
        return null;
      },
    },
    { field: "WO_RMKS", headerName: "Remarks", filter: "agTextColumnFilter" },
    {
      field: "DUEBY",
      headerName: "DueBy",
      filter: "agDateColumnFilter",
      colId: "params_1",
      filterParams: agGridDateFilterdateFilter,
      sort: "asc",
    },
    {
      field: "WR_DUE",
      headerName: "WO due date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilterdateFilter,
    },
    {
      field: "WO_REL_DATE",
      headerName: "Release Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilterdateFilter,
    },
    {
      field: "WO_ORD_DATE",
      headerName: "Ordered Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilterdateFilter,
    },
    {
      field: "WR_PART",
      headerName: "Part",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.openItemInfo(e.rowData.WR_PART),
        isLink: true,
      },
    },
    { field: "FULLDESC", headerName: "Desc", filter: "agTextColumnFilter" },
    {
      field: "WR_QTY_ORD",
      headerName: "Qty Ordered",
      filter: "agNumberColumnFilter",
    },
    {
      field: "WR_QTY_COMP",
      headerName: "Qty Completed",
      filter: "agNumberColumnFilter",
    },
    {
      field: "WR_QTY_OUTQUE",
      headerName: "Qty Out Queue",
      filter: "agNumberColumnFilter",
    },
    {
      field: "OPENQTY",
      headerName: "Qty Open",
      filter: "agNumberColumnFilter",
    },
    {
      field: "WR_WKCTR",
      headerName: "Work Center",
      filter: "agSetColumnFilter",
    },
    { field: "WR_OP", headerName: "Work OP", filter: "agSetColumnFilter" },
    {
      field: "WO_SO_JOB",
      headerName: "Sales Order",
      filter: "agSetColumnFilter",
      cellRenderer: function (e) {
        return e.data && 1 == e.data.DROPINCLASS
          ? '<span class="badge badge-danger">DROP IN</span>'
          : e.value;
      },
    },
    {
      field: "add_comments",
      headerName: "Comments",
      filter: "agSetColumnFilter",
    },
    {
      field: "recent_comments.comments_html",
      headerName: "Recent Comment",
      filter: "agTextColumnFilter",
    },
    {
      field: "print_details.assignedTo",
      headerName: "Pick Assigned To",
      filter: "agSetColumnFilter",
    },
    {
      field: "WO_STATUS",
      headerName: "WO status",
      filter: "agSetColumnFilter",
    },
    {
      field: "WO_QTY_COMP",
      headerName: "WO Qty Completed",
      filter: "agNumberColumnFilter",
    },
    {
      field: "WR_QTY_INQUE",
      headerName: "In Queue",
      filter: "agNumberColumnFilter",
    },
    {
      field: "WR_QTY_OUTQUE",
      headerName: "Out Queue",
      filter: "agNumberColumnFilter",
    },
    {
      field: "misc.lateReasonCode",
      headerName: "Late Reason Code",
      filter: "agSetColumnFilter",
      cellRenderer: LateReasonCodeRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.openReasonCodes(
            "lateReasonCode",
            e.rowData.misc,
            e.rowData.WR_NBR + "-" + e.rowData.WR_OP,
            e.rowData
          );
        },
      },
    },
    {
      field: "misc.shipping_db_status",
      headerName: "Shipping DB Status",
      filter: "agSetColumnFilter",
    },
    {
      field: "TOTAL_LINES",
      headerName: "Total Lines",
      filter: "agNumberColumnFilter",
    },
  ];

  dataRendered = false;

  gridOptions: GridOptions = {
    // rowBuffer: 0,
    // animateRows: true,
    getRowId: (data: any) => data?.data.SO,
    columnDefs: [],
    onGridReady: async (params: any) => {
      this.gridApi = params.api;
      this.setGridApi.emit(params);
    },
    onFirstDataRendered: (params) => {
      this.dataRendered = true;
      this.setDataRenderered.emit(this.dataRendered);
      highlightRowView(params, "id", this.id);
    },
  };
}
