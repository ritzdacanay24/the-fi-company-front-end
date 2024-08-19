import { GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../user-constant";
import { UserService } from "@app/core/api/field-service/user.service";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { SharedModule } from "@app/shared/shared.module";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { EmployeeCellRenderer } from "@app/shared/ag-grid/cell-renderers/employee-cell-renderer.component";

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
      field: "first",
      headerName: "First",
      filter: "agTextColumnFilter",
      hide: true,
    },
    {
      field: "last",
      headerName: "Last",
      filter: "agMultiColumnFilter",
      hide: true,
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
    treeData: true,
    groupDisplayType: "singleColumn",
    suppressRowClickSelection: true,
    rowSelection: "multiple",
    groupSelectsChildren: true,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    autoGroupColumnDef: {
      filter: "agTextColumnFilter",
      headerName: "Username",
      minWidth: 300,
      cellRenderer: "agGroupCellRenderer",
      wrapText: false,
      autoHeight: false,
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: EmployeeCellRenderer,
      },
    },
    groupDefaultExpanded: -1, // expand all groups by default
    getDataPath: (data: any) => {
      return data.orgHierarchy;
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

      this.data = await this.api.getUserTree();

      function myFlat(a, prefix = "") {
        return a.reduce(function (flattened, { first, subItems, ...a }) {
          let last = a["last"] ? a["last"] : "";
          first =
            prefix == ""
              ? first + " " + last
              : prefix + "/" + first + " " + last;

          return flattened
            .concat([
              {
                orgHierarchy: first,
                ...a,
              },
            ])
            .concat(subItems ? myFlat(subItems, first) : []);
        }, []);
      }

      this.data = myFlat(this.data);

      for (let i = 0; i < this.data.length; i++) {
        this.data[i].orgHierarchy = this.data[i]?.orgHierarchy?.split("/");
      }

      console.log(this.data);

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
