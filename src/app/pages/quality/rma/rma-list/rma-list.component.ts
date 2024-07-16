import { GridApi } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { NAVIGATION_ROUTE } from "../rma-constant";
import { RmaService } from "@app/core/api/quality/rma.service";
import moment from "moment";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
  ],
  selector: "app-rma-list",
  templateUrl: "./rma-list.component.html",
})
export class RmaListComponent implements OnInit {
  constructor(
    public api: RmaService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

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
    });

    this.getData();
  }

  columnDefs: any = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "customer",
      headerName: "Customer",
      filter: "agMultiColumnFilter",
    },
    {
      field: "customerComment",
      headerName: "Customer Comment",
      filter: "agMultiColumnFilter",
      maxWidth: 200,
    },
    {
      field: "dateIssued",
      headerName: "Date Issued",
      filter: "agMultiColumnFilter",
    },
    {
      field: "disposition",
      headerName: "Disposition",
      filter: "agMultiColumnFilter",
    },
    {
      field: "failureCode",
      headerName: "Failure Code",
      filter: "agMultiColumnFilter",
    },
    {
      field: "notes",
      headerName: "Notes",
      filter: "agMultiColumnFilter",
      maxWidth: 200,
    },
    {
      field: "orderNumber",
      headerName: "Order Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "partDescription",
      headerName: "Part Description",
      filter: "agMultiColumnFilter",
    },
    {
      field: "partNumber",
      headerName: "Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "qirNumber",
      headerName: "QIR Number",
      filter: "agMultiColumnFilter",
    },
    { field: "qty", headerName: "Qty", filter: "agMultiColumnFilter" },
    {
      field: "returnMethod",
      headerName: "Return Method",
      filter: "agMultiColumnFilter",
    },
    {
      field: "returnType",
      headerName: "Return Type",
      filter: "agMultiColumnFilter",
    },
    {
      field: "rmaNumber",
      headerName: "RMA Number",
      filter: "agMultiColumnFilter",
    },
    { field: "status", headerName: "Status", filter: "agMultiColumnFilter" },
    {
      field: "tag_qn_number",
      headerName: "Tag QN Number",
      filter: "agMultiColumnFilter",
    },
    { field: "type", headerName: "Type", filter: "agMultiColumnFilter" },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
  ];

  @Input() selectedViewType = "Open";

  selectedViewOptions = [
    {
      name: "Open",
      value: 1,
      selected: false,
    },
    {
      name: "Closed",
      value: 0,
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  title = "RMA List";

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

  gridOptions = {
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
    onFilterChanged: (params) => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: {
          gridParams,
        },
      });
    },
    onSortChanged: (params) => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: {
          gridParams,
        },
      });
    },
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

      this.data = await this.api.getList(
        this.selectedViewType,
        this.dateFrom,
        this.dateTo,
        this.isAll
      );

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
