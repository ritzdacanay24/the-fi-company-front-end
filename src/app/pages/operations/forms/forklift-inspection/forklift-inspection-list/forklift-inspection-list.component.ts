import { ColDef, GridApi, GridOptions } from "ag-grid-community";
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
import { NAVIGATION_ROUTE } from "../forklift-inspection-constant";
import { ForkliftInspectionService } from "@app/core/api/operations/forklift-inspection/forklift-inspection.service";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: "app-forklift-inspection-list",
  templateUrl: "./forklift-inspection-list.component.html",
})
export class ForkliftInspectionListComponent implements OnInit {
  constructor(
    public api: ForkliftInspectionService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  disable = false;

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

    if (this.selectedViewType == "Open") {
      this.disable = true;
      this.isAll = true;
    }
  }

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
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "date_created",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "model_number",
      headerName: "Model number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "operator",
      headerName: "Operator",
      filter: "agMultiColumnFilter",
    },
    {
      field: "passed_count",
      headerName: "Passed",
      filter: "agMultiColumnFilter",
    },
    {
      field: "failed_count",
      headerName: "Failed",
      filter: "agMultiColumnFilter",
    },
    {
      field: "total_count",
      headerName: "Total Inspection Points",
      filter: "agMultiColumnFilter",
    },
    {
      field: "percent",
      headerName: "Percent",
      filter: "agMultiColumnFilter",
      cellClass: (params: any) => {
        if (params.value < 100) {
          return ["bg-danger-subtle bg-opacity-75 text-danger"];
        } else if (params.value == "Yes") {
          return ["bg-success-subtle bg-opacity-75 text-success"];
        } else {
          return [];
        }
      },
      cellRenderer: (params: any) => params.value + "%",
    },
  ];

  @Input() selectedViewType = "Open";

  selectedViewOptions = [
    {
      name: "Open",
      value: 0,
      selected: false,
    },
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

  title = "Forklift Inspection Report";

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
    if (this.selectedViewType == "Open") {
      this.disable = true;
      this.isAll = true;
    } else {
      this.disable = false;
    }

    try {
      this.gridApi?.showLoadingOverlay();

      let params: any = {};
      if (this.selectedViewType != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewType
        );
        params = { active: status.value };
      }

      this.data = await this.api.getList();

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
