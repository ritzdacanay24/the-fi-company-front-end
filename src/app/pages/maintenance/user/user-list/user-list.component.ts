import { GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../user-constant";
import { UserService } from "@app/core/api/field-service/user.service";
import { SharedModule } from "@app/shared/shared.module";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { EmployeeCellRenderer } from "@app/shared/ag-grid/cell-renderers/employee-cell-renderer.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule, AgGridModule],
  selector: "app-user-list",
  templateUrl: "./user-list.component.html",
})
export class UserListComponent implements OnInit {
  constructor(
    public api: UserService,
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
      field: "first",
      headerName: "first",
      filter: "agTextColumnFilter",
    },
    {
      field: "last",
      headerName: "Last",
      filter: "agMultiColumnFilter",
      hide: false,
    },
    {
      field: "state",
      headerName: "state",
      filter: "agMultiColumnFilter",
      hide: false,
    },
    {
      field: "email",
      headerName: "Email",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "title",
      headerName: "Title",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    { field: "area", headerName: "Department", filter: "agMultiColumnFilter" },
    { field: "title", headerName: "Title", filter: "agMultiColumnFilter" },
    {
      field: "isEmployee",
      headerName: "isEmployee",
      filter: "agMultiColumnFilter",
    },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "lastLoggedIn",
      headerName: "Last Logged In",
      filter: "agMultiColumnFilter",
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
    { field: "access", headerName: "Access", filter: "agMultiColumnFilter" },
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
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
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

      let params: any = {};
      if (this.selectedViewTypeUserList != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewTypeUserList
        );
        params = { active: status.value };
      }

      this.data = await this.api.find({ active: 1 });

      this.router.navigate(["."], {
        queryParams: {
          selectedViewTypeUserList: this.selectedViewTypeUserList,
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
