import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { NAVIGATION_ROUTE } from "../rma-constant";
import { RmaService } from "@app/core/api/quality/rma.service";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { RmaActionsCellRendererComponent } from "../rma-actions-cell-renderer.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
    BreadcrumbComponent,
  ],
  selector: "app-rma-list",
  templateUrl: "./rma-list.component.html",
})
export class RmaListComponent implements OnInit {
  pageId: string = '/quality/rma';
  searchName = "";

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Quality', link: '/dashboard/quality' },
      { label: 'RMA List' },
    ];
  }

  constructor(
    public api: RmaService,
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
      cellRenderer: RmaActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter", hide: true },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "customer",
      headerName: "Customer",
      filter: "agMultiColumnFilter",
    },
    {
      field: "customerComment",
      headerName: "Customer Comment",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "dateIssued",
      headerName: "Date Issued",
      filter: "agMultiColumnFilter",
    },
    {
      field: "disposition",
      headerName: "Disposition",
      filter: "agMultiColumnFilter",
    },
    {
      field: "failureCode",
      headerName: "Failure Code",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "notes",
      headerName: "Notes",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "orderNumber",
      headerName: "Order Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "partDescription",
      headerName: "Part Description",
      filter: "agMultiColumnFilter",
    },
    {
      field: "partNumber",
      headerName: "Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "qirNumber",
      headerName: "QIR Number",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    { field: "qty", headerName: "Qty", filter: "agMultiColumnFilter" },
    {
      field: "returnMethod",
      headerName: "Return Method",
      filter: "agMultiColumnFilter",
    },
    {
      field: "returnType",
      headerName: "Return Type",
      filter: "agMultiColumnFilter",
    },
    {
      field: "rmaNumber",
      headerName: "RMA Number",
      filter: "agMultiColumnFilter",
    },
    { field: "status", headerName: "Status", filter: "agMultiColumnFilter" },
    {
      field: "tag_qn_number",
      headerName: "Tag QN Number",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    { field: "type", headerName: "Type", filter: "agMultiColumnFilter" },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter", hide: true },
  ];

  @Input() selectedViewType = "Open";

  selectedViewOptions = [
    {
      name: "Open",
      value: 1,
      selected: false,
    },
    {
      name: "Closed",
      value: 0,
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  title = "RMA List";

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

      let params: any = {};
      if (this.selectedViewType != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewType
        );
        params = { active: status.value };
      }

      this.data = await this.api.getList(
        this.selectedViewType,
        null,
        null,
        true
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
}
