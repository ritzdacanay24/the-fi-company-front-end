import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { NAVIGATION_ROUTE } from "../non-billable-code-constant";
import { NonBillableCodeService } from "@app/core/api/field-service/fs_non_billable_code.service";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule, AgGridModule],
  selector: "app-non-billable-code-list",
  templateUrl: "./non-billable-code-list.component.html",
})
export class NonBillableCodeListComponent implements OnInit {
  constructor(
    public api: NonBillableCodeService,
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
    { field: "name", headerName: "Name", filter: "agMultiColumnFilter" },
    {
      field: "description",
      headerName: "Description",
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

  title = "Non-billable codes";

  gridApi: GridApi;

  data: any[];

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
      this.data = await this.api.getAllRequests(this.selectedViewType);

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
