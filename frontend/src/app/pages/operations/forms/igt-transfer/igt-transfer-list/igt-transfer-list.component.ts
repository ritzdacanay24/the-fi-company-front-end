import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../igt-transfer-constant";
import { BreadcrumbItem, BreadcrumbComponent } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { IgtTransferService } from "@app/core/api/operations/igt-transfer/igt-transfer.service";
import { IgtTransferActionsCellRendererComponent } from "../igt-transfer-actions-cell-renderer.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: "app-igt-transfer-list",
  templateUrl: "./igt-transfer-list.component.html",
})
export class IgtTransferListComponent implements OnInit {
  constructor(
    public api: IgtTransferService,
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
      field: "actions",
      headerName: "Actions",
      filter: false,
      sortable: false,
      pinned: "left",
      cellRenderer: IgtTransferActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 115,
      minWidth: 115,
    },
    {
      field: "so_number",
      headerName: "SO Number",
      filter: "agMultiColumnFilter",
      minWidth: 130,
    },
    {
      field: "transfer_reference",
      headerName: "Transfer Reference",
      filter: "agMultiColumnFilter",
      minWidth: 160,
    },
    {
      field: "transfer_reference_description",
      headerName: "Description",
      filter: "agMultiColumnFilter",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "from_location",
      headerName: "From Location",
      filter: "agMultiColumnFilter",
      minWidth: 140,
    },
    {
      field: "to_location",
      headerName: "To Location",
      filter: "agMultiColumnFilter",
      minWidth: 140,
    },
    { field: "date", headerName: "Date", filter: "agMultiColumnFilter", minWidth: 120 },
    {
      field: "created_date",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
      minWidth: 130,
    },
    // Hidden columns
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter", hide: true },
    { field: "created_by", headerName: "Created By", filter: "agMultiColumnFilter", hide: true },
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

  searchName = "";

  title = "IGT Transfer List";

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
    getRowId: (params) => params.data.id?.toString()?.toString(),
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

      let params: any = {};
      if (this.selectedViewType != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewType
        );
        params = { active: status.value };
      }

      this.data = await this.api.getList(
        this.selectedViewType
      );

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

  // Helper methods for statistics display
  getActiveCount(): number {
    if (!this.data) return 0;
    return this.data.filter(item => item.active === 1 || item.active === true || item.active === '1').length;
  }

  getCompletedCount(): number {
    if (!this.data) return 0;
    // Assuming a transfer is completed if it has both from and to locations filled
    return this.data.filter(item => item.from_location && item.to_location && item.date).length;
  }

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: "Operations", link: "/operations" },
      { label: "Forms", link: "/operations/forms" },
      { label: "IGT Transfers", active: true },
    ];
  }
}
