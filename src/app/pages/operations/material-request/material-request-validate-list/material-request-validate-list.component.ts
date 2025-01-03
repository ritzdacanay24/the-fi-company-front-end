import { GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import moment from "moment";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
import { MaterialRequestValidateComponent } from "../material-request-validate/material-request-validate.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    MaterialRequestValidateComponent,
  ],
  selector: "app-material-request-validate-list",
  templateUrl: "./material-request-validate-list.component.html",
})
export class MaterialRequestValidateListComponent implements OnInit {
  constructor(
    public api: MaterialRequestService,
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
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "assemblyNumber",
      headerName: "Assembly Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "pickList",
      headerName: "Pick List",
      filter: "agMultiColumnFilter",
    },
    {
      field: "lineNumber",
      headerName: "Line Number",
      filter: "agMultiColumnFilter",
    },
    { field: "dueDate", headerName: "Due Date", filter: "agMultiColumnFilter" },
    {
      field: "priority",
      headerName: "Priority",
      filter: "agMultiColumnFilter",
    },
    { field: "info", headerName: "Info", filter: "agMultiColumnFilter" },
    {
      field: "isCableRequest",
      headerName: "Is Cable Request",
      filter: "agMultiColumnFilter",
    },
    {
      field: "pickedCompletedDate",
      headerName: "Picked Completed Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "requestor",
      headerName: "Requestor",
      filter: "agMultiColumnFilter",
    },
    {
      field: "specialInstructions",
      headerName: "Special Instructions",
      filter: "agMultiColumnFilter",
    },
    {
      field: "validated",
      headerName: "Validated",
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
      filter: "agMultiColumnFilter",
    },
    {
      field: "deleteReason",
      headerName: "Delete Reason",
      filter: "agMultiColumnFilter",
    },
    {
      field: "deleteReasonBy",
      headerName: "Delete Reason By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "deleteReasonDate",
      headerName: "Delete Reason Date",
      filter: "agMultiColumnFilter",
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
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

  title = "Validation Queue";

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
    this.id = id;
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate(
      ["/dashboard/operations/material-request/validate-list"],
      {
        queryParamsHandling: "merge",
        queryParams: {
          id: id,
          gridParams,
        },
      }
    );
  }

  goBack = (refresh) => {
    this.id = null;
    this.router.navigate(
      ["/dashboard/operations/material-request/validate-list"],
      {
        queryParamsHandling: "merge",
        queryParams: {
          id: this.id,
        },
      }
    );
    if (refresh) this.getData();
  };

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

      this.data = await this.api.getValidation();

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
