import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../shortages-constant";
import { ShortagesService } from "@app/core/api/operations/shortages/shortages.service";
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";
import {
  highlightRowView,
  autoSizeColumns,
  agGridDateFilter,
} from "src/assets/js/util";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { WorkOrderInfoModalService } from "@app/shared/components/work-order-info-modal/work-order-info-modal.component";
import { LateReasonCodeModalService } from "@app/shared/components/last-reason-code-modal/late-reason-code-modal.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { CommentsRendererV2Component } from "@app/shared/ag-grid/comments-renderer-v2/comments-renderer-v2.component";
import { LateReasonCodeRendererV2Component } from "@app/shared/ag-grid/cell-renderers/late-reason-code-renderer-v2/late-reason-code-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-shortages-list",
  templateUrl: "./shortages-list.component.html",
})
export class ShortagesListComponent implements OnInit {
  constructor(
    public api: ShortagesService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
    private commentsModalService: CommentsModalService,
    private itemInfoModalService: ItemInfoModalService,
    private workOrderInfoModalService: WorkOrderInfoModalService,
    private lateReasonCodeModalService: LateReasonCodeModalService
  ) {}

  comment;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];

      this.id = params["id"];
      this.isAll = params["isAll"]
        ? params["isAll"].toLocaleLowerCase() === "true"
        : false;
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
      this.comment = params["comment"];
    });

    this.getData();

    if (this.comment) {
      this.viewComment(this.comment);
    }
  }

  query;

  pageId = "/shortages/open-shortages";

  openLateReasonCodeService(key, misc, uniqueId, rowData) {
    misc.userName = "Shortages";
    const modalRef = this.lateReasonCodeModalService.open(
      key,
      misc,
      uniqueId,
      "Shortages"
    );
    modalRef.result.then((result: any) => {
      rowData.misc = result;
      this.updated(rowData, rowData.id, true);
    });
  }

  updated(newData: any, uniqueId: number, ws = false) {
    let updatedData = [];
    this.gridApi.forEachNode(function (rowNode) {
      if (rowNode.data.id == uniqueId) {
        updatedData.push(rowNode);
      }
    });
    this.gridApi.redrawRows({ rowNodes: updatedData });
  }

  viewComment = (id) => {
    let modalRef = this.commentsModalService.open(id, "Shortage Request");
    modalRef.result.then(
      (result: any) => {
        let rowNode = this.gridApi.getRowNode(id);
        rowNode.data.recent_comments = result;
        this.gridApi.redrawRows({ rowNodes: [rowNode] });

        this.router.navigate([`.`], {
          relativeTo: this.activatedRoute,
          queryParamsHandling: "merge",
          queryParams: {
            comment: null,
          },
        });
      },
      () => {}
    );
  };

  openWorkOrderInfo = (workOrder) => {
    let modalRef = this.workOrderInfoModalService.open(workOrder);
    modalRef.result.then(
      (result: any) => {},
      () => {}
    );
  };

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    {
      field: "Comments",
      headerName: "Comments",
      filter: "agMultiColumnFilter",
      cellRenderer: CommentsRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.viewComment(e.rowData.id),
      },
      valueGetter: function (params) {
        if (params.data)
          if (params.data.recent_comments?.bg_class_name == "bg-info") {
            return "Has Comments";
          }
        if (params.data.recent_comments?.bg_class_name == "bg-success") {
          return "New Comments";
        } else {
          return "No Comments";
        }
      },
    },
    { field: "id", headerName: "ID", filter: "agNumberColumnFilter" },
    {
      field: "partNumber",
      headerName: "Short Item",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.itemInfoModalService.open(e.rowData.partNumber),
        isLink: true,
      },
    },
    {
      field: "partDesc",
      headerName: "Part Description",
      filter: "agMultiColumnFilter",
    },
    {
      field: "assemblyNumber",
      headerName: "Assembly Number",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) =>
          this.itemInfoModalService.open(e.rowData.assemblyNumber),
        isLink: true,
      },
    },
    { field: "qty", headerName: "Qty", filter: "agNumberColumnFilter" },
    {
      field: "dueDate",
      headerName: "Due Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "priority",
      headerName: "Priority",
      filter: "agMultiColumnFilter",
    },
    {
      field: "deliveredCompleted",
      headerName: "Delivered Completed",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "deliveredCompletedBy",
      headerName: "Delivered Completed By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "jobNumber",
      headerName: "Job Number",
      filter: "agMultiColumnFilter",
    },
    { field: "mrfId", headerName: "MRF ID", filter: "agNumberColumnFilter" },
    {
      field: "mrf_line",
      headerName: "MRF Line",
      filter: "agNumberColumnFilter",
    },
    {
      field: "poNumber",
      headerName: "PO Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "productionIssuedBy",
      headerName: "Production Issued By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "productionIssuedDate",
      headerName: "Production Issued Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "lineNumber",
      headerName: "Line Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "reasonPartNeeded",
      headerName: "Reason Part Needed",
      filter: "agMultiColumnFilter",
    },
    {
      field: "receivingCompleted",
      headerName: "Receiving Completed",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "receivingCompletedBy",
      headerName: "Receiving Completed By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "supplyCompleted",
      headerName: "Supply Completed",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "supplyCompletedBy",
      headerName: "Supply Completed By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "woNumber",
      headerName: "WO Number",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.openWorkOrderInfo(e.rowData.woNumber),
        isLink: true,
      },
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
    {
      field: "active_line",
      headerName: "Active Line",
      filter: "agMultiColumnFilter",
    },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "misc.lateReasonCode",
      headerName: "Late Reason Code",
      filter: "agSetColumnFilter",
      cellRenderer: LateReasonCodeRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.openLateReasonCodeService(
            "lateReasonCode",
            e.rowData.misc,
            e.rowData.id,
            e.rowData
          );
        },
      },
    },
  ];

  @Input() selectedViewType = "Active";

  selectedViewOptions = [
    {
      name: "Active",
      value: 1,
      selected: false,
    },
    {
      name: "Inactive",
      value: 0,
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  @Input() selectedQueueType = "All Open";

  selectedQueueOptions = [
    "Supply Open",
    "Delivered Open",
    "Receiving Open",
    "Production Open",
    "All Open",
  ];

  title = "Shortage List";

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = false;

  changeIsAll() {}

  dateFrom = moment()
    .subtract(1, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  copiedData;
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
    },
    getRowId: (params) => params.data.id?.toString(),
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

  onEdit(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
      },
    });
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();

      let params: any = {};
      if (this.selectedViewType != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewType
        );
        params = { active: status.value };
      }

      params = { ...params, queue: this.selectedQueueType };

      this.data = await this.api.getList(params);

      this.router.navigate(["."], {
        queryParams: {
          selectedViewType: this.selectedViewType,
          isAll: this.isAll,
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
}
