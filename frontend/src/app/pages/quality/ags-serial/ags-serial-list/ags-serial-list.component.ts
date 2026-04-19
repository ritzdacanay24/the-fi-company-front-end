import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { AgsSerialService } from "@app/core/api/quality/ags-serial.service";
import { NAVIGATION_ROUTE } from "../ags-serial-constant";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: "app-ags-serial-list",
  templateUrl: "./ags-serial-list.component.html",
})
export class AgsSerialListComponent implements OnInit {
  constructor(
    public api: AgsSerialService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

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
      field: "actions",
      headerName: "Actions",
      filter: false,
      sortable: false,
      pinned: "left",
      maxWidth: 115,
      minWidth: 115,
      cellRenderer: () => {
        return `
          <div class="d-flex align-items-center justify-content-center h-100">
            <button class="btn btn-sm btn-outline-primary select-btn" title="Select Record">
              SELECT
            </button>
          </div>
        `;
      },
      onCellClicked: (params: any) => {
        const target = params.event.target;
        if (target.closest('.select-btn')) {
          this.onEdit(params.data.id);
        }
      },
    },
    {
      field: "generated_SG_asset",
      headerName: "Asset Number",
      filter: "agMultiColumnFilter",
      pinned: "left",
      minWidth: 150,
    },
    {
      field: "id",
      headerName: "ID",
      filter: "agMultiColumnFilter",
      maxWidth: 80,
    },
    {
      field: "poNumber",
      headerName: "WO Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "sgPartNumber",
      headerName: "AGS Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "serialNumber",
      headerName: "EyeFi Serial Number",
      filter: "agMultiColumnFilter",
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const serialNumber = params.value.toString();
        return `<code style="
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #495057;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 2px;
          padding: 1px 4px;
          text-transform: uppercase;
        ">${serialNumber}</code>`;
      },
    },
    {
      field: "property_site",
      headerName: "Property Site",
      filter: "agMultiColumnFilter",
      hide: true
    },
    {
      field: "inspectorName",
      headerName: "Inspector",
      filter: "agMultiColumnFilter",
    },
    {
      field: "timeStamp",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "lastUpdate",
      headerName: "Last Update",
      filter: "agMultiColumnFilter",
    },
  ];

  title = "AGS List";

  selectedViewType = "All";

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

  gridApi: GridApi;

  data: any[];
  allData: any[];

  id = null;

  searchTerm = '';

  onSearch() {
    if (!this.searchTerm?.trim()) {
      this.data = this.allData;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.data = (this.allData || []).filter((row) =>
      Object.values(row).some((val) =>
        val != null && String(val).toLowerCase().includes(term)
      )
    );
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
    try {
      this.gridApi?.showLoadingOverlay();
      this.allData = await this.api.getList(this.selectedViewType, "", "", true);
      this.data = this.allData;
      this.searchTerm = '';

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
