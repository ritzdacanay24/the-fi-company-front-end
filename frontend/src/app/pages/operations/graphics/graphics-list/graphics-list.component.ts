import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { GraphicsService } from "@app/core/api/operations/graphics/graphics.service";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { NAVIGATION_ROUTE } from "../graphics-constant";
import {
  agGridDateFilterdateFilter,
  highlightRowView,
  autoSizeColumns,
} from "src/assets/js/util";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-graphics-list",
  templateUrl: "./graphics-list.component.html",
  styleUrls: [],
})
export class GraphicsListComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public api: GraphicsService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.selectedViewType = params["selectedViewType"] || this.selectedViewType;
    });
    this.getData();
  }

  query: any;

  selectedViewType: "Open" | "All" = "Open";

  setFilter = (q: string) => this.gridApi.setGridOption("quickFilterText", q);

  title = "Graphics List";

  gridApi: GridApi;

  data: any[];
  allData: any[];

  id = null;

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

  getTotalCount(): number {
    return this.data?.length || 0;
  }

  onViewTypeChange(): void {
    this.applyViewFilter();
    this.router.navigate(["."], {
      queryParams: {
        selectedViewType: this.selectedViewType,
      },
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });
  }

  private applyViewFilter(): void {
    if (this.selectedViewType === "All") {
      this.data = [...(this.allData || [])];
      return;
    }

    this.data = (this.allData || []).filter((row: any) => {
      const openQty = Number(row?.openQty ?? 0);
      if (!Number.isNaN(openQty)) {
        return openQty > 0;
      }

      const statusText = String(row?.statusText || "").toLowerCase();
      return statusText.includes("open");
    });
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
    {
      field: "graphicsWorkOrder",
      headerName: "Work Order",
      filter: "agTextColumnFilter",
    },
    {
      field: "itemNumber",
      headerName: "Item Number",
      filter: "agTextColumnFilter",
    },
    { field: "statusText", headerName: "Queue", filter: "agSetColumnFilter" },
    {
      field: "dueDate",
      headerName: "Due Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilterdateFilter,
    },
    {
      field: "shippedOn",
      headerName: "Shipped On",
      filter: "agDateColumnFilter",
    },
    { field: "qty", headerName: "Qty", filter: "agSetColumnFilter" },
    {
      field: "qtyShipped",
      headerName: "Qty Shipped",
      filter: "agSetColumnFilter",
    },
    { field: "openQty", headerName: "Qty Open", filter: "agSetColumnFilter" },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilterdateFilter,
    },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agSetColumnFilter",
    },
  ];

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
    onFilterChanged: (params) => this.updateUrl(params),
    onSortChanged: (params) => this.updateUrl(params),
    getRowId: (params) => params.data.id?.toString(),
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

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.allData = await this.api.getGraphicsList();
      this.applyViewFilter();
      this.router.navigate(["."], {
        queryParams: {
          dateFrom: null,
          dateTo: null,
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
