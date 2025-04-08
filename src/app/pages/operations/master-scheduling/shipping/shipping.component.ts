import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { NgSelectModule } from "@ng-select/ng-select";
import { MasterSchedulingService } from "@app/core/api/operations/master-scheduling/master-scheduling.service";
import moment from "moment";
import {
  agGridDateFilter,
  currencyFormatter,
  highlightRowView,
  highlightRowViewV1,
  isEmpty,
} from "src/assets/js/util";
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";
import { WorkOrderRoutingModalService } from "@app/shared/components/work-order-routing-modal/work-order-routing-modal.component";
import { FgLabelPrintModalService } from "@app/shared/components/fg-label-print-modal/fg-label-print-modal.component";
import { AddressInfoModalService } from "@app/shared/components/address-info-modal/address-info-modal.component";
import { OwnerTransactionsService } from "@app/shared/components/owner-transactions/owner-transactions.component";
import { CustomerOrderInfoModalService } from "@app/shared/components/customer-order-info/customer-order-info.component";
import { SalesOrderInfoModalService } from "@app/shared/components/sales-order-info-modal/sales-order-info-modal.component";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { PorLabelPrintModalService } from "@app/shared/components/por-label-print-modal/por-label-print-modal.component";
import { PlacardModalService } from "@app/shared/components/placard-modal/placard-modal.component";
import { LateReasonCodeModalService } from "@app/shared/components/last-reason-code-modal/late-reason-code-modal.component";
import { NotesModalService } from "@app/shared/components/notes-modal/notes-modal.component";
import { RfqModalService } from "@app/shared/components/rfq-modal/rfq-modal.component";
import { ShippingMiscModalService } from "@app/shared/components/shipping-misc-modal/shipping-misc-modal.component";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { TableSettingsService } from "@app/core/api/table-settings/table-settings.service";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { WebsocketService } from "@app/core/services/websocket.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { PartsOrderModalService } from "@app/pages/field-service/parts-order/parts-order-modal/parts-order-modal.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { ShipAccountRendererV2Component } from "@app/shared/ag-grid/cell-renderers/ship-account-renderer-v2/ship-account-renderer-v2.component";
import { CommentsRendererV2Component } from "@app/shared/ag-grid/comments-renderer-v2/comments-renderer-v2.component";
import { EditIconV2Component } from "@app/shared/ag-grid/edit-icon-v2/edit-icon-v2.component";
import { IconRendererV2Component } from "@app/shared/ag-grid/icon-renderer-v2/icon-renderer-v2.component";
import { NotesRendererV2Component } from "@app/shared/ag-grid/notes-renderer-v2/notes-renderer-v2.component";
import { StatusDateRenderer } from "@app/shared/ag-grid/cell-renderers/status-date-renderer-v2.component";
import { ChecboxRendererV2 } from "@app/shared/ag-grid/cell-renderers/checkbox-renderer-v2/checkbox-renderer-v2.component";
import { LateReasonCodeRendererV2Component } from "@app/shared/ag-grid/cell-renderers/late-reason-code-renderer-v2/late-reason-code-renderer-v2.component";
import { OwnerRendererV2Component } from "@app/shared/ag-grid/owner-renderer-v2/owner-renderer-v2.component";
import { WorkOrderInfoModalService } from "@app/shared/components/work-order-info-modal/work-order-info-modal.component";

const WS_SHIPPING = "WS_SHIPPING";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    NgbDropdownModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-shipping",
  templateUrl: "./shipping.component.html",
})
export class ShippingComponent implements OnInit {
  onBtExport() {
    this.gridApi!.exportDataAsExcel();
  }

  pastDue() {
    this.gridApi!.setColumnFilterModel("STATUS", {
      values: ["Past Due"],
      filterType: "set",
    }).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  dueToday() {
    this.gridApi!.setColumnFilterModel("STATUS", {
      values: ["Due Today"],
      filterType: "set",
    }).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  future() {
    this.gridApi!.setColumnFilterModel("STATUS", {
      values: ["Future Order"],
      filterType: "set",
    }).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  all() {
    this.gridApi!.setColumnFilterModel("STATUS", null).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  constructor(
    public router: Router,
    private api: MasterSchedulingService,
    public activatedRoute: ActivatedRoute,
    private commentsModalService: CommentsModalService,
    private workOrderRoutingModalService: WorkOrderRoutingModalService,
    private fgLabelPrintModal: FgLabelPrintModalService,
    private addressInfoModalService: AddressInfoModalService,
    private ownerTransactionsService: OwnerTransactionsService,
    private customerOrderInfoModalService: CustomerOrderInfoModalService,
    private salesOrderInfoModalService: SalesOrderInfoModalService,
    private itemInfoModalService: ItemInfoModalService,
    private porLabelPrintModalService: PorLabelPrintModalService,
    private placardModalService: PlacardModalService,
    private lateReasonCodeModalService: LateReasonCodeModalService,
    private notesModalService: NotesModalService,
    private rfqModalService: RfqModalService,
    private shippingMiscModalService: ShippingMiscModalService,
    private tableSettingsService: TableSettingsService,
    private websocketService: WebsocketService,
    private authenticationService: AuthenticationService,
    private partsOrderModalService: PartsOrderModalService,
    private workOrderInfoModalService: WorkOrderInfoModalService

  ) {
    this.websocketService = websocketService;

    //watch for changes if this modal is open
    //changes will only occur if modal is open and if the modal equals to the same qir number
    const ws_observable = this.websocketService.multiplex(
      () => ({ subscribe: WS_SHIPPING }),
      () => ({ unsubscribe: WS_SHIPPING }),
      (message) => message.type === WS_SHIPPING
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

  statusCount = {
    pastDue: 0,
    todayDue: 0,
    futureDue: 0,
  };

  private calculateStatus() {
    let statusCount = {
      pastDue: 0,
      todayDue: 0,
      futureDue: 0,
    };

    let data = this.data;
    for (let i = 0; i < data.length; i++) {
      let status = data[i].STATUS;
      if (status == "Past Due") {
        statusCount.pastDue++;
      } else if (status == "Due Today") {
        statusCount.todayDue++;
      } else {
        statusCount.futureDue++;
      }
    }

    return statusCount;
  }

  public refreshCells(rowNode) {
    this.gridApi.flashCells({
      rowNodes: rowNode,
      flashDuration: 3000,
      fadeDuration: 2000,
    });
  }

  comment;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.gridFilterId = params["gridFilterId"];
      this.gridViewId = params["gridViewId"];
      this.comment = params["comment"];
    });

    this.getData();

    if (this.comment) {
      this.viewComment(this.comment, null);
    }
  }

  dateFrom = moment()
    .subtract(12, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event: { [x: string]: string }) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  viewFilter() {
    const savedModel = this.gridApi.getFilterModel();
  }

  gridFilterId;

  gridViewId;

  gridApi: GridApi;

  id = null;

  title = "Shipping";

  public isInspection(data: any) {
    return (
      data.source_inspection_required == "Yes" &&
      (data.source_inspection_completed == "No" ||
        data.source_inspection_completed == "" ||
        data.source_inspection_completed == null)
    );
  }
  isModalOpen = false;

  viewComment = (salesOrderLineNumber: any, id: string, so?) => {

    if (this.isModalOpen) return;

    this.isModalOpen = true;

    let modalRef = this.commentsModalService.open(
      salesOrderLineNumber,
      "Sales Order"
    );
    modalRef.result.then(
      (result: any) => {
        this.isModalOpen = false;

        let rowNode = this.gridApi.getRowNode(id);
        rowNode.data.recent_comments = result;
        this.gridApi.redrawRows({ rowNodes: [rowNode] });

        this.websocketService.next({
          actions: {
            time: moment().format("h:mm A"),
            icon: "feather icon-message-square",
            link: `/master-scheduling/shipping?comment=${rowNode.data.SALES_ORDER_LINE_NUMBER}`,
            info: `Comment added by ${this.authenticationService.currentUserValue.full_name} on SO#: ${rowNode.data.SALES_ORDER_LINE_NUMBER} Comment: ${rowNode.data.recent_comments.comments_html}`,
          },
          message: rowNode.data,
          type: WS_SHIPPING,
        });
        this.router.navigate([`.`], {
          relativeTo: this.activatedRoute,
          queryParamsHandling: "merge",
          queryParams: {
            comment: null,
          },
        });
      },
      () => {
        this.isModalOpen = false;
        this.router.navigate([`.`], {
          relativeTo: this.activatedRoute,
          queryParamsHandling: "merge",
          queryParams: {
            comment: null,
          },
        });
      }
    );
  };

  viewPartsOrder = (so_number_and_line) => {
    let modalRef = this.partsOrderModalService.open(so_number_and_line);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewRouting = (partNumber) => {
    let modalRef = this.workOrderRoutingModalService.open(partNumber);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewPlacard = (so, line, partNumber) => {
    let modalRef = this.placardModalService.open(so, line, partNumber);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewReasonCode = (key, misc, soLineNumber, rowData) => {
    let modalRef = this.lateReasonCodeModalService.open(
      key,
      misc,
      soLineNumber,
      "Shipping"
    );
    modalRef.result.then(
      (result: any) => {
        rowData.misc = result;
        this.sendAndUpdate(rowData, rowData.id);
      },
      () => { }
    );
  };

  viewNotes = (e: { rowData: any }) => {
    const uniqueId = `${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`;
    let modalRef = this.notesModalService.open(
      uniqueId,
      e.rowData.recent_notes,
      "Sales Order"
    );
    modalRef.result.then(
      (result: any) => {
        e.rowData.recent_notes = result;
        this.sendAndUpdate(e.rowData, e.rowData.id);
      },
      () => { }
    );
  };

  vewRfq = (e: { rowData: any }) => {
    let modalRef = this.rfqModalService.open(
      e.rowData.SOD_NBR,
      e.rowData.SOD_LINE
    );
    modalRef.result.then(
      (result: any) => {
        this.getData();
      },
      () => { }
    );
  };

  openMisc(soLine, rowData) {
    const modalRef = this.shippingMiscModalService.open(soLine);
    modalRef.result.then((result: any) => {
      rowData.misc = result;
      this.sendAndUpdate(rowData, rowData.id);
    });
  }

  searchName = "";

  onFilterTextBoxChanged(value: any) {
    this.gridApi.setGridOption("quickFilterText", value);
  }

  columnDefs: ColDef[] = [
    {
      field: "Misc Edit",
      headerName: "Misc Edit",
      filter: false,
      valueGetter: (params) => {
        if (params.data) {
          return `SO#: ${params?.data?.sales_order_line_number}`;
        } else {
          return null;
        }
      },
      cellRenderer: ShipAccountRendererV2Component,
      cellRendererParams: {
        onClick: (e) =>
          this.openMisc(
            `${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`,
            e.rowData
          ),
      },
      maxWidth: 120,
      suppressHeaderMenuButton: false,
    },
    {
      field: "STATUS",
      headerName: "Status",
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => {
        if (params.data) {
          if (params.value == "Future Order")
            return `<span class="badge bg-success-subtle text-success mb-0">${params.value}</span>`;
          if (params.value == "Past Due")
            return `<span class="badge bg-danger-subtle text-danger mb-0">${params.value}</span>`;
          if (params.value == "Due Today")
            return `<span class="badge bg-warning-subtle text-warning mb-0">${params.value}</span>`;
          return params.value;
        }
        return null;
      },
    },
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
      field: "PT_REV",
      headerName: "Part Revision",
      filter: "agMultiColumnFilter",
    },
    {
      field: "SOD_NBR",
      headerName: "SO #",
      filter: "agMultiColumnFilter",
      cellStyle: (e) => {
        if (
          e.data &&
          e.data.SOD_NBR &&
          e.data.SOD_NBR.toString().includes("SV")
        )
          return { borderColor: "#0074D9", borderWidth: "1px" };
        return null;
      },
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.salesOrderInfoModalService.open(e.rowData.SOD_NBR),
        isLink: true,
      },
    },
    { field: "SOD_LINE", headerName: "Line #", filter: "agNumberColumnFilter" },
    {
      field: "SOD_CONTR_ID",
      headerName: "PO #",
      filter: "agMultiColumnFilter",
    },
    { field: "SO_CUST", headerName: "Customer", filter: "agMultiColumnFilter" },
    {
      field: "SO_SHIP",
      headerName: "Ship To",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.addressInfoModalService.open(e.rowData.SO_SHIP),
        isLink: true,
      },
    },
    {
      field: "SOD_QTY_ORD",
      headerName: "Qty Ordered",
      filter: "agNumberColumnFilter",
    },
    {
      field: "SOD_QTY_ALL",
      headerName: "Qty Allocated",
      filter: "agNumberColumnFilter",
    },
    {
      field: "SOD_QTY_SHIP",
      headerName: "Qty Shipped",
      filter: "agNumberColumnFilter",
    },
    {
      field: "QTYOPEN",
      headerName: "Qty Open",
      filter: "agNumberColumnFilter",
    },
    {
      field: "LD_QTY_OH",
      headerName: "Qty OH",
      filter: "agSetColumnFilter",
      cellClass: (e) => {
        if (e.data && e.data.LD_QTY_OH <= 0)
          return ["border-start border-danger"];
        return null;
      },
      filterParams: {
        valueGetter: (params) => {
          if (params.data && params.data.LD_QTY_OH <= 0) {
            return "No qty on hand";
          } else {
            return "On hand qty available";
          }
        },
      },
    },
    {
      field: "Drop in today",
      headerName: "Dropped in today",
      filter: "agSetColumnFilter",
      cellClass: (e) => {
        if (e.data && e.data.SOD_DUE_DATE == e.data.SO_ORD_DATE)
          return ["border-start border-danger"];
        return null;
      },
      valueGetter: (e) => {
        if (e.data && e.data.SOD_DUE_DATE == e.data.SO_ORD_DATE)
          return "Dropped in today"
        return null;
      },
      filterParams: {
        valueGetter: (e) => {
          if (e.data && e.data.SOD_DUE_DATE == e.data.SO_ORD_DATE) {
            return "Dropped in today";
          } else {
            return null;
          }
        },
      },
    },
    {
      field: "SOD_DUE_DATE",
      headerName: "Due Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
      cellStyle: (params) => {
        if (params.data && this.isInspection(params.data?.misc)) {
          return {
            "background-color": "#0074D9",
            color: "#fff",
          };
        }
        return null;
      },
      // cellRenderer: (params) => {
      //   if (params.data) {
      //     if (params.data && this.isInspection(params.data?.misc)) {
      //       let startdate = moment(params.data.SOD_DUE_DATE);
      //       const dow = startdate.day();

      //       if (dow == 1) {
      //         startdate = startdate.subtract(3, "days");
      //         return startdate.format("YYYY-MM-DD");
      //       } else {
      //         startdate = startdate.subtract(1, "days");
      //         return startdate.format("YYYY-MM-DD");
      //       }
      //     } else {
      //       return params.data.SOD_DUE_DATE;
      //     }
      //   }
      // },
    },
    {
      field: "SOD_ORDER_CATEGORY",
      headerName: "Customer CO #",
      filter: "agTextColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.customerOrderInfoModalService.open(e.rowData.SOD_ORDER_CATEGORY);
        },
        isLink: true,
      },
    },
    {
      field: "SO_ORD_DATE",
      headerName: "Ordered Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    { field: "PT_ROUTING", headerName: "Routing", filter: "agSetColumnFilter" },
    {
      field: "Comments",
      headerName: "Comments",
      filter: "agMultiColumnFilter",
      cellRenderer: CommentsRendererV2Component,
      cellRendererParams: {
        onClick: (params: any) =>
          this.viewComment(
            params.rowData.sales_order_line_number,
            params.rowData.id,
            params.rowData.SOD_NBR
          ),
      },
      valueGetter: (params) => {
        if (params.data)
          if (params.data?.recent_comments?.bg_class_name == "bg-info") {
            return "Has Comments";
          }
        if (params.data?.recent_comments?.bg_class_name == "bg-success") {
          return "New Comments";
        } else {
          return "No Comments";
        }
      },
      filterParams: {
        valueGetter: (params) => {
          let data = params.value;
          if (data !== "") {
            return "Has Comments";
          } else {
            return "No Comments";
          }
        },
      },
    },
    {
      field: "recent_comments.comments_html",
      headerName: "Recent Comment",
      filter: "agTextColumnFilter",
      autoHeight: false,
      wrapText: false,
      width: 100,
      minWidth: 100,
      // suppressSizeToFit: true,
      // suppressAutoSize: true,
      tooltipField: "recent_comments.comments_html",
    },
    {
      field: "CMT_CMMT",
      headerName: "QAD Comments",
      filter: "agMultiColumnFilter",
      tooltipField: "CMT_CMMT",
      filterParams: {
        valueGetter: (params) => {
          let data = params.data.CMT_CMMT;
          if (data !== "") {
            return "Has Comments";
          } else {
            return "No Comments";
          }
        },
      },
    },
    {
      field: "misc.userName",
      headerName: "Owner",
      filter: "agMultiColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "ownerTransactions",
      headerName: "Owner Transactions",
      filter: "agSetColumnFilter",
      cellRenderer: OwnerRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.ownerTransactionsService.open(
            `${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`
          );
        },
      },
      filterParams: {
        valueGetter: (params) => {
          if (params.data && !isEmpty(params.data.recent_owner_changes)) {
            return "New Owners";
          } else {
            return "Show All";
          }
        },
      },
    },
    {
      field: "SOD_LIST_PR",
      headerName: "List Price",
      filter: "agSetColumnFilter",
      valueFormatter: currencyFormatter,
      aggFunc: "sum",
      filterParams: {
        valueGetter: (params) => {
          if (params.data.SOD_LIST_PR == 0.0) {
            return "No cost list price";
          } else {
            return "Has list price";
          }
        },
      },
    },
    {
      field: "SOD_LIST_PR",
      headerName: "No Cost List Price",
      filter: "agSetColumnFilter",
      valueFormatter: currencyFormatter,
      cellStyle: function (e) {
        if (e.data && 0 == e.data.SOD_LIST_PR)
          return { borderColor: "red", borderWidth: "1px", display: "inline" };
        return null;
      },
      filterParams: {
        valueGetter: (params) => {
          if (params.data.SOD_LIST_PR == 0.0) {
            return "No cost list price";
          } else {
            return "Has list price";
          }
        },
      },
    },
    {
      field: "OPENBALANCE",
      headerName: "Open Balance",
      filter: "agNumberColumnFilter",
      valueFormatter: currencyFormatter,
      aggFunc: "sum",
    },
    {
      field: "WORK_ORDER_ROUTING",
      headerName: "View Work Order Routing",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.viewRouting(e.rowData.SOD_PART),
        isLink: true,
      },
    },
    {
      field: "LEADTIME",
      headerName: "Lead Time",
      filter: "agTextColumnFilter",
    },
    { field: "AGE", headerName: "Age", filter: "agSetColumnFilter" },
    {
      field: "RFQ",
      headerName: "RFQ",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.vewRfq(e);
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "misc.arrivalDate",
      headerName: "Arrival Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "misc.shipViaAccount",
      headerName: "Ship Via Account",
      filter: "agSetColumnFilter",
    },
    {
      field: "sod_acct",
      headerName: "Sod Account",
      filter: "agSetColumnFilter",
    },
    {
      field: "generate_placard",
      headerName: "Generate Placard",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewPlacard(
            e.rowData.SOD_NBR,
            e.rowData.SOD_LINE,
            e.rowData.SOD_PART
          );
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "recent_notes.notes",
      headerName: "Notes",
      filter: "agSetColumnFilter",
      cellRenderer: NotesRendererV2Component,
      cellRendererParams: {
        onClick: this.viewNotes.bind(this),
      },
      filterParams: {
        valueGetter: (params) => {
          let isEMpty = isEmpty(params.data.recent_notes);
          if (!isEMpty) {
            return "Has Notes";
          } else {
            return "No Notes";
          }
        },
      },
    },
    {
      field: "SO_SHIPVIA",
      headerName: "Ship Via",
      filter: "agMultiColumnFilter",
    },
    {
      field: "misc.container",
      headerName: "Container",
      filter: "agMultiColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.container_due_date",
      headerName: "Container due date",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.tj_po_number",
      headerName: "TJ PO #",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.tj_due_date",
      headerName: "TJ Due Date",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.pallet_count",
      headerName: "Pallet Count",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
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
      field: "POR-Label",
      headerName: "POR Label",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.porLabelPrintModalService.open(
            e.rowData.CP_CUST_PART,
            e.rowData.SOD_CONTR_ID,
            e.rowData.SOD_PART,
            e.rowData.PT_DESC1,
            e.rowData.PT_DESC2
          );
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "misc.g2e_comments",
      headerName: "G2E",
      filter: "agMultiColumnFilter",
      cellRenderer: EditIconV2Component,
      editable: true,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.shortages_review",
      headerName: "Shortages Review",
      filter: "agSetColumnFilter",
      cellRenderer: ChecboxRendererV2,
      cellRendererParams: {
        onClick: (e) => this.update(e.rowData),
      },
    },
    {
      field: "all_mention_comments.all_comments",
      headerName: "All Comments",
      filter: "agTextColumnFilter",
      maxWidth: 200,
      hide: true,
    },
    {
      field: "misc.lateReasonCodePerfDate",
      headerName: "Late Reason Code (Perf Date)",
      filter: "agSetColumnFilter",
      cellRenderer: LateReasonCodeRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewReasonCode(
            "lateReasonCodePerfDate",
            e.rowData.misc,
            e.rowData.SOD_NBR + "-" + e.rowData.SOD_LINE,
            e.rowData
          );
        },
      },
    },
    {
      field: "misc.lateReasonCode",
      headerName: "Late Reason Code",
      filter: "agSetColumnFilter",
      cellRenderer: LateReasonCodeRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewReasonCode(
            "lateReasonCode",
            e.rowData.misc,
            e.rowData.SOD_NBR + "-" + e.rowData.SOD_LINE,
            e.rowData
          );
        },
      },
    },
    {
      field: "misc.clear_to_build_status",
      headerName: "CTB in Period",
      filter: "agSetColumnFilter",
      cellEditor: "agRichSelectCellEditor",
      editable: true,
      cellClass: (params: any) => {
        if (params.value == "CTB in Period") {
          return ["bg-success bg-opacity-50"];
        } else if (params.value == "At Risk") {
          return ["bg-danger bg-opacity-75"];
        } else if (params.value == "Miss") {
          return ["bg-warning bg-opacity-50"];
        } else {
          return [];
        }
      },

      cellEditorParams: {
        values: ["CTB in Period", "At Risk", "Miss", "NA"],
        cellEditorPopup: false,
      },

      valueGetter: (params) => {
        if (params.data) {
          if (params?.data?.misc?.clear_to_build_status != "NA") {
            return (
              params?.data?.misc?.clear_to_build_status || "--Select status--"
            );
          }
          return "--Select status--";
        } else {
          return "--Select status--";
        }
      },
    },
    {
      field: "clear_to_build_period",
      headerName: "CTB Report Period",
      filter: "agMultiColumnFilter",
      valueGetter: (params) => {
        if (params.data)
          return moment(params?.data?.SOD_DUE_DATE).format("MM-YYYY");
        return "";
      },
    },
    { field: "sod_type", headerName: "SOD Type", filter: "agSetColumnFilter" },
    {
      field: "sod_per_date",
      headerName: "Performance Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
      cellRenderer: StatusDateRenderer,
    },
    {
      field: "sod_req_date",
      headerName: "Request Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "REQ_DUE_DIFF",
      headerName: "Request and Due Date Diff",
      filter: "agMultiColumnFilter",
    },
    {
      field: "VIEW_PARTS_ORDER_REQUEST",
      headerName: "View Parts Order Request",
      filter: "agMultiColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.viewPartsOrder(e.rowData.SOD_NBR),
        iconName: "mdi mdi-ballot-outline",
      },
    },
    {
      field: "WO_NBR", headerName: "SO/Job", filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: ({ rowData }) =>
          this.workOrderInfoModalService.open(rowData.WO_NBR),
        isLink: true,
      },
    },
  ];

  pageId = "/master-scheduling/shipping";

  tableList: any;
  currentTableView: any;
  async getTableSettings() {
    this.tableList = await this.tableSettingsService.getTableByUserId({
      pageId: this.pageId,
    });
    this.gridApi!.applyColumnState({
      state: this.tableList.currentView.data,
      applyOrder: true,
    });
  }

  defaultFilters = [
    {
      id: -1,
      name: "Future Orders",
      data: {
        STATUS: {
          values: ["Future Order"],
          filterType: "set",
        },
      },
    },
    {
      id: -2,
      name: "Past Due Orders",
      data: {
        STATUS: {
          values: ["Past Due"],
          filterType: "set",
        },
      },
    },
  ];

  emitFilter($event) {
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridFilterId: $event,
      },
    });
  }

  emitGrid($event) {
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridViewId: $event,
      },
    });
  }

  dataRenderered = false;

  gridOptions: GridOptions = {
    // rowBuffer: 0,
    animateRows: true,
    tooltipShowDelay: 0,
    columnDefs: [],
    enableCharts: true,
    enableAdvancedFilter: false,
    enableBrowserTooltips: true,
    suppressColumnMoveAnimation: true,
    getRowId: (data: any) => data?.data.id?.toString(),
    onGridReady: (params) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      this.dataRenderered = true;
      if (this.comment) {
        highlightRowViewV1(params, "id", this.comment?.replace("-", ""));
        this.gridApi.ensureColumnVisible("Comments", "end");
      } else {
        highlightRowView(params, "id", this.id);
      }
      this.setPinnedRows();
    },
    // onFilterChanged: params => this.updateUrl(params),
    // onSortChanged: params => this.updateUrl(params),
    onCellEditingStopped: (event) => {
      if (event.oldValue == event.newValue || event.value === undefined) return;
      this.update(event.data);
    },
    getRowClass: (params: any) => {

      let classes = [];
      if (params.data && params.data.SOD_DUE_DATE == params.data.SO_ORD_DATE) {
        classes.push("border-2 border border-danger border-start")
      } else if (params.data?.SALES_ORDER_LINE_NUMBER === this.comment) {
        classes.push("bg-primary-subtle")
      } else if (params.data.misc?.hot_order) {
        classes.push("border border-danger bg-opacity-10 bg-danger")
      }
      return classes;
    },
    context: {
      pageId: this.pageId,
    },
  };

  public async update(data: any) {
    data.misc.shippingMisc = 1;
    data.misc.so = data.sales_order_line_number; //add on insert since so is not available yet

    /**
     * this data should be the full data object!!
     */

    /**
     *  Save data to database
     */

    // Save transactop
    try {
      this.gridApi?.showLoadingOverlay();
      let res = await this.api.saveMisc(data.misc);
      data.misc = res;
      this.sendAndUpdate(data, data.id);
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }

    // let res = await this.api
    //     .saveMisc(data.misc)
    //     .pipe(first())
    //     .subscribe((res) => {
    //         data.misc = res;
    //         this.sendAndUpdate(data, data.id);
    //         this.showHideOverlay(false);
    //     }, () => this.showHideOverlay(false));
  }

  //send the updated data to the wing. Once update redraw rows.
  public sendAndUpdate(newData: any, id: any) {
    /**
     * newData MUST be the complete data object
     */
    let rowNode = this.gridApi.getRowNode(id);
    rowNode.data = newData;
    this.gridApi.redrawRows({ rowNodes: [rowNode] });

    this.setPinnedRows();

    this.websocketService.next({
      message: newData,
      type: WS_SHIPPING,
    });
  }

  //send the updated data to the wing. Once update redraw rows.
  public sendAndUpdateByUser(newData: any, id: any) {
    /**
     * newData MUST be the complete data object
     */
    let rowNode = this.gridApi.getRowNode(id);
    rowNode.data = newData;
    this.gridApi.redrawRows({ rowNodes: [rowNode] });

    this.setPinnedRows();

    // this.websocketService.next({
    //     message: newData,
    //     type: WS_SHIPPING
    // });
  }

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

  getAllRows() {
    let rowData = [];
    this.gridApi.forEachNode((node) => rowData.push(node.data));
    return rowData;
  }

  setPinnedRows() {
    let data = this.getAllRows();
    let res = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.misc?.hot_order) {
        res.push(data[i]);
      }
    }
    this.gridApi.setGridOption("pinnedTopRowData", res);
  }

  data: any;
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.data = await this.api.getShipping();
      this.statusCount = this.calculateStatus();
      this.setPinnedRows();
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
