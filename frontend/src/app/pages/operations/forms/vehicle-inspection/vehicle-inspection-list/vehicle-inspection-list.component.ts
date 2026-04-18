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
import { VehicleInspectionService } from "@app/core/api/operations/vehicle-inspection/vehicle-inspection.service";
import { NAVIGATION_ROUTE } from "../vehicle-inspection-constant";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { VehicleInspectionActionsCellRendererComponent } from "../vehicle-inspection-actions-cell-renderer.component";
import { VehicleInspectionProgressRendererComponent } from "../vehicle-inspection-progress-renderer.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
    BreadcrumbComponent,
    VehicleInspectionActionsCellRendererComponent,
    VehicleInspectionProgressRendererComponent,
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
      this.id = params["id"];
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
      this.showPendingOnly = params["showPending"]
        ? params["showPending"].toLocaleLowerCase() === "true"
        : false;
    });

    this.getData();

    if (this.selectedViewType == "Open") {
      this.disable = true;
    }
  }

  columnDefs: ColDef[] = [
    {
      field: "Actions",
      headerName: "Actions",
      filter: false,
      sortable: false,
      pinned: "left",
      cellRenderer: VehicleInspectionActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 100,
      minWidth: 100,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter", hide: true },
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
      headerName: "Pass / Fail",
      field: "passed_count",
      filter: false,
      sortable: false,
      cellRenderer: VehicleInspectionProgressRendererComponent,
      minWidth: 220,
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

  searchName = "";

  gridApi: GridApi;

  data: any[];
  
  allData: any[]; // Store complete dataset
  
  showPendingOnly = false;
  
  pendingCount = 0;

  id = null;

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

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: "Operations", link: "/dashboard/operations" },
      { label: "Forms", link: "/operations/forms" },
      { label: "Vehicle Inspections", active: true },
    ];
  }
}
