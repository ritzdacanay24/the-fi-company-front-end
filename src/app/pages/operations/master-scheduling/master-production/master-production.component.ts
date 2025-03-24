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

    <div style="position:absolute;bottom:10px;right:10px">
    <img src="data:image/png;base64,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" style="width:100px;100px"/>
    <p>Lets go Packers!</p>
    </div>
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
