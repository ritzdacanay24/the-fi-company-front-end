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
import { VehicleInspectionService } from "@app/core/api/operations/vehicle-inspection/vehicle-inspection.service";
import { NAVIGATION_ROUTE } from "../vehicle-inspection-constant";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";

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
  selector: "app-vehicle-inspection-list",
  templateUrl: "./vehicle-inspection-list.component.html",
})
export class VehicleInspectionListComponent implements OnInit {
  constructor(
    public api: VehicleInspectionService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  disable = false;
  pageId = "/vehicle-inspection/list";

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
      this.showPendingOnly = params["showPending"]
        ? params["showPending"].toLocaleLowerCase() === "true"
        : false;
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
      field: "created_by",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "truck_license_plate",
      headerName: "License Plate",
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
      field: "not_used",
      headerName: "Not Used",
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
      cellRenderer: (params: any) => (params.value ? params.value + "%" : ""),
    },
    {
      headerName: "Pending Resolved Count",
      field: "confirmed_resolved_count",
      filter: "agMultiColumnFilter",
      cellClass: (params: any) => {
        if (params.value > 0) {
          return ["bg-danger-subtle bg-opacity-75 text-danger"];
        } else {
          return [];
        }
      },
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

  title = "Vehicle Inspection Report";

  gridApi: GridApi;

  data: any[];
  
  allData: any[]; // Store complete dataset
  
  showPendingOnly = false;
  
  pendingCount = 0;

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

      this.allData = await this.api.getList();
      
      // Calculate pending count
      this.pendingCount = this.allData.filter(item => 
        item.confirmed_resolved_count > 0
      ).length;
      
      // Apply pending filter if active
      if (this.showPendingOnly) {
        this.data = this.allData.filter(item => item.confirmed_resolved_count > 0);
      } else {
        this.data = this.allData;
      }

      this.router.navigate(["."], {
        queryParams: {
          selectedViewType: this.selectedViewType,
          isAll: this.isAll,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          showPending: this.showPendingOnly,
        },
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
      });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
  
  togglePendingFilter() {
    this.showPendingOnly = !this.showPendingOnly;
    
    if (this.showPendingOnly) {
      this.data = this.allData.filter(item => item.confirmed_resolved_count > 0);
    } else {
      this.data = this.allData;
    }
    
    this.router.navigate(["."], {
      queryParams: {
        showPending: this.showPendingOnly,
      },
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });
  }
}
