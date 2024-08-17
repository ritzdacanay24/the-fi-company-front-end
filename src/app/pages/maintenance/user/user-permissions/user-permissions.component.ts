import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MenuService } from "@app/core/api/menu/menu.service";
import { PageAccessService } from "@app/core/api/page-access/page-access.service";
import { MENU } from "@app/layouts/sidebar/menu";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridOptions } from "ag-grid-community";
import { autoSizeColumns } from "src/assets/js/util";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-user-permissions",
  templateUrl: "./user-permissions.component.html",
  styleUrls: [],
})
export class UserPermissionsComponent implements OnInit {
  searchName = "";

  onFilterTextBoxChanged(value: any) {
    this.gridApi.setGridOption("quickFilterText", value);
  }

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private pageAccessService: PageAccessService,
    private menuService: MenuService,
    private activatedRoute: ActivatedRoute
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.menu_id = params["menu_id"];
    });
  }

  menu_id = 1;

  columnDefs: ColDef[] = [
    {
      field: "id",
      headerName: "Page ID",
      filter: "agNumberColumnFilter",
    },
    {
      field: "page_access_requested",
      headerName: "Page Access Requested",
      filter: "agMultiColumnFilter",
    },
    {
      field: "page_access_id",
      headerName: "Page Access ID",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "label",
      headerName: "label",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    { field: "link", headerName: "Link", filter: "agMultiColumnFilter" },
    {
      field: "accessRequired",
      headerName: "Access Required",
      filter: "agMultiColumnFilter",
      cellClassRules: {
        "text-danger": (params) => {
          return params.data?.accessRequired == false || params.data?.isTitle;
        },
      },
      cellRenderer: (params) =>
        params.data?.accessRequired == false || params.data?.isTitle
          ? false
          : params.data?.accessRequired,
    },
    {
      field: "description",
      headerName: "Description",
      filter: "agMultiColumnFilter",
    },
  ];

  gridApi;
  gridOptions: GridOptions = {
    groupAggFiltering: true,
    groupDisplayType: "singleColumn",
    getRowStyle: (params) => {
      if (!params.data?.accessRequired || params.data?.isTitle) {
        return {
          cursor: "not-allowed",
          pointerEvents: "none",
        };
      } else if (params.data?.page_access_requested == "Requested Access") {
        return {
          fontWeight: "900",
        };
      } else return null;
    },

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
        checkbox: true,
      },
    },
    onCellValueChanged: async (event) => {
      await this.menuService.update(event.data.id, {
        accessRequired: event.value,
      });
    },
    groupDefaultExpanded: -1, // expand all groups by default
    getDataPath: (data: any) => {
      return data.orgHierarchy;
    },
    onFirstDataRendered: (params) => {
      params.api.forEachNode((node) => {
        node.setSelected(!!node.data && node.data.page_access_id !== null);
      });
      autoSizeColumns(params);

      if (this.menu_id) {
        this.gridApi!.setColumnFilterModel("id", {
          type: "equal",
          filter: this.menu_id,
        }).then(() => {
          this.gridApi!.onFilterChanged();
        });
      }
    },
    onRowSelected: async (event) => {
      if (event.source == "checkboxSelected") {
        if (event.data.link)
          await this.pageAccessService.create({
            user_id: this.id,
            page_name: event.data.link,
            checked: event.node.isSelected,
            menu_id: event.data.id,
          });
      }
    },
  };

  @Input() id;

  ngOnInit(): void {
    this.getData();
  }

  title = "User Page Access";

  icon = "mdi-cogs";

  object = MENU;

  isLoading = false;

  data;

  async getData() {
    let data = await this.menuService.menuAndByUserId(this.id);

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

  returnZero() {
    return 0;
  }
}
