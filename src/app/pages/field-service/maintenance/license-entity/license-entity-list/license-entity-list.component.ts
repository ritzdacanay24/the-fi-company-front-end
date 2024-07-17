import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgbDropdownModule, NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { NAVIGATION_ROUTE } from "../license-entity-constant";
import { LicenseService } from "@app/core/api/field-service/license.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbNavModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-license-entity-list",
  templateUrl: `./license-entity-list.component.html`,
})
export class LicenseEntityListComponent implements OnInit {
  constructor(
    public api: LicenseService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
    });

    this.getData();
  }

  pageId = "/field-service/list-properties";

  searchName = "";

  onFilterTextBoxChanged(value: any) {
    this.gridApi.setGridOption("quickFilterText", value);
  }

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "notes",
      headerName: "Notes",
      filter: "agMultiColumnFilter",
      maxWidth: 300,
      tooltipField: "notes",
    },
    { field: "property", headerName: "Casino", filter: "agMultiColumnFilter" },
    {
      field: "address1",
      headerName: "Address 1",
      filter: "agMultiColumnFilter",
    },
    { field: "address2", headerName: "STE", filter: "agMultiColumnFilter" },
    { field: "city", headerName: "City", filter: "agMultiColumnFilter" },
    { field: "state", headerName: "State", filter: "agMultiColumnFilter" },
    {
      field: "zip_code",
      headerName: "Zip Code",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    { field: "country", headerName: "Country", filter: "agMultiColumnFilter" },
    {
      field: "property_phone",
      headerName: "Property Phone",
      filter: "agMultiColumnFilter",
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
    {
      field: "created_by",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "created_date",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "license_required",
      headerName: "License Required",
      filter: "agMultiColumnFilter",
    },
    { field: "website", headerName: "Website", filter: "agMultiColumnFilter" },
    {
      field: "license_expired_date",
      headerName: "License Expired Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "documents_required",
      headerName: "Documents Required",
      filter: "agMultiColumnFilter",
    },
  ];

  @Input() selectedViewType: "Active" | "Inactive" | "All" | string = "Active";

  selectedViewOptions = [
    {
      name: "Active",
      selected: false,
    },
    {
      name: "Inactive",
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  title = "Properties";

  gridApi: GridApi;

  data: any[];

  id = null;

  gridOptions: GridOptions = {
    enableBrowserTooltips: true,
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
      this.router.navigate([NAVIGATION_ROUTE.LIST], {
        queryParamsHandling: "merge",
        queryParams: {
          gridParams,
        },
      });
    },
    onSortChanged: (params) => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([NAVIGATION_ROUTE.LIST], {
        queryParamsHandling: "merge",
        queryParams: {
          gridParams,
        },
      });
    },
  };

  onEdit(data) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: data.id,
        gridParams,
      },
    });
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.data = await this.api.getAll(this.selectedViewType);

      this.router.navigate(["."], {
        queryParams: {
          selectedViewType: this.selectedViewType,
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
