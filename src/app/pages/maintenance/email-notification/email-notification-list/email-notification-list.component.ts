import { GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../email-notification-constant";
import { SharedModule } from "@app/shared/shared.module";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { EmailNotificationService } from "@app/core/api/email-notification/email-notification.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule, AgGridModule],
  selector: "app-email-notification-list",
  templateUrl: "./email-notification-list.component.html",
})
export class EmailNotificationListComponent implements OnInit {
  constructor(
    public api: EmailNotificationService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.selectedViewTypeUserList =
        params["selectedViewTypeUserList"] || this.selectedViewTypeUserList;
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
      field: "user_id",
      headerName: "User Id",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "location",
      headerName: "Location",
      filter: "agMultiColumnFilter",
      rowGroup: true,
      hide: true,
    },
    { field: "email", headerName: "User Email", filter: "agMultiColumnFilter" },
  ];

  @Input() selectedViewTypeUserList = "Active";

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

  title = "Users";

  gridApi: GridApi;

  data: any[];

  id = null;

  gridOptions: GridOptions = {
    groupDisplayType: "singleColumn",
    groupDefaultExpanded: -1, 
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
      this.data = [];
      this.gridApi?.showLoadingOverlay();

      this.data = await this.api.getAll();

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
