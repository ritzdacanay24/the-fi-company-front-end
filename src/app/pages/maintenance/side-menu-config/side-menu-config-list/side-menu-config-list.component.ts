import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../side-menu-config-constant";
import { SharedModule } from "@app/shared/shared.module";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { MenuService } from "@app/core/api/menu/menu.service";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule, AgGridModule],
  selector: "app-side-menu-config-list",
  templateUrl: "./side-menu-config-list.component.html",
})
export class SideMenuConfigListComponent implements OnInit {
  constructor(
    public api: MenuService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  searchName = "";

  onFilterTextBoxChanged(value: any) {
    this.gridApi.setGridOption("quickFilterText", value);
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.selectedViewTypeUserList =
        params["selectedViewTypeUserList"] || this.selectedViewTypeUserList;
    });

    this.getData();
  }

  columnDefs: ColDef[] = [
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "label",
      headerName: "label",
      filter: "agMultiColumnFilter",
      hide: false,
      editable: true,
    },
    {
      field: "link",
      headerName: "Link",
      filter: "agMultiColumnFilter",
      editable: true,
    },
    {
      field: "parent_id",
      headerName: "Parent ID",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "isTitle",
      headerName: "Is Title",
      filter: "agMultiColumnFilter",
      cellDataType: "boolean",
      editable: true,
    },
    {
      field: "accessRequired",
      headerName: "Access Required",
      filter: "agMultiColumnFilter",
      cellDataType: "boolean",
      editable: true,
    },
    {
      field: "active",
      headerName: "Page Active",
      filter: "agMultiColumnFilter",
      cellDataType: "boolean",
      editable: true,
      valueGetter: (params) => {
        if (params.data) return params.data.active ? true : false;
        return 0;
      },
    },
    {
      field: "icon",
      headerName: "Icon",
      filter: "agMultiColumnFilter",
      editable: true,
    },
    {
      field: "description",
      headerName: "Description",
      filter: "agMultiColumnFilter",
      editable: true,
    },
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

  title = "Side Menu Config";

  gridApi: GridApi;

  data: any[];

  id = null;

  gridOptions: GridOptions = {
    groupAggFiltering: true,
    groupDisplayType: "singleColumn",
    treeData: true,
    suppressRowClickSelection: true,
    rowSelection: "multiple",
    groupSelectsChildren: true,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    autoGroupColumnDef: {
      headerName: "Page Name",
      minWidth: 300,
      cellRendererParams: {
        suppressCount: true,
        checkbox: false,
      },
    },
    onCellValueChanged: async (event) => {
      delete event.data.orgHierarchy;
      await this.api.update(event.data.id, event.data);
    },
    groupDefaultExpanded: -1, // expand all groups by default
    getDataPath: (data: any) => {
      return data.orgHierarchy;
    },
    onFirstDataRendered: (params) => {
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
    let data = await this.api.getAllMenu();

    function myFlat(a, prefix = "") {
      return a.reduce(function (flattened, { label, subItems, ...a }) {
        label = prefix == "" ? label : prefix + "/" + label;
        return flattened
          .concat([
            {
              orgHierarchy: label,
              ...a,
            },
          ])
          .concat(subItems ? myFlat(subItems, label) : []);
      }, []);
    }

    data = myFlat(data);
    for (let i = 0; i < data.length; i++) {
      data[i].orgHierarchy = data[i]?.orgHierarchy?.split("/");
    }
    this.data = data;
  }
}
