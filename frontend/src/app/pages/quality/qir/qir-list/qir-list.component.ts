import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { NAVIGATION_ROUTE } from "../qir-constant";
import { QirService } from "@app/core/api/quality/qir.service";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { QirActionsCellRendererComponent } from './qir-actions-cell-renderer.component';

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
  selector: "app-qir-list",
  templateUrl: "./qir-list.component.html",
  styleUrls: ["./qir-list.component.scss"]
})
export class QirListComponent implements OnInit {
  pageId = "/qir/list-qir";
  quickSearchTerm = "";

  constructor(
    public api: QirService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

  onCreate() {
    this.router.navigate([NAVIGATION_ROUTE.CREATE], {
      queryParamsHandling: "merge"
    });
  }

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Quality', link: '/dashboard/quality' },
      { label: 'Quality Issues' },
    ];
  }

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
      cellRenderer: QirActionsCellRendererComponent,
      cellRendererParams: {
        onView: (data: any) => this.onView(data.id),
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 150,
      minWidth: 150,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter", hide: true },
    { field: "status", headerName: "Status", filter: "agMultiColumnFilter" },
    {
      field: "qir_response_id",
      headerName: "QIR Reponse Found",
      filter: "agMultiColumnFilter",
    },
    {
      field: "CustomerPartNumber",
      headerName: "Customer Part Number",
      filter: "agTextColumnFilter",
    },
    {
      field: "componentType",
      headerName: "Component Type",
      filter: "agTextColumnFilter",
    },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agTextColumnFilter",
      hide: true,
    },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "customerName",
      headerName: "Customer Name",
      filter: "agTextColumnFilter",
    },
    {
      field: "customerReportedDate",
      headerName: "Customer Reported Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "eyefiPartNumber",
      headerName: "Eyefi Part Number",
      filter: "agTextColumnFilter",
    },
    {
      field: "eyefiSerialNumber",
      headerName: "Eyefi Serial Number",
      filter: "agTextColumnFilter",
    },
    {
      field: "failureType",
      headerName: "Failure Type",
      filter: "agTextColumnFilter",
    },
    {
      field: "platformType",
      headerName: "Platform Type",
      filter: "agTextColumnFilter",
    },
    { field: "ncr_id", headerName: "CAR ID", filter: "agTextColumnFilter" },
    { field: "priority", headerName: "Priority", filter: "agTextColumnFilter" },
    {
      field: "purchaseOrder",
      headerName: "Purchase Order",
      filter: "agTextColumnFilter",
    },
    { field: "qir", headerName: "QIR Number", filter: "agTextColumnFilter" },
    {
      field: "qtyAffected",
      headerName: "Qty Affected",
      filter: "agTextColumnFilter",
    },
    {
      field: "qtyAffected1",
      headerName: "Qty Affected 1",
      filter: "agTextColumnFilter",
      hide: true,
    },
    {
      field: "stakeholder",
      headerName: "Stakeholder",
      filter: "agTextColumnFilter",
    },
    {
      field: "supplierName",
      headerName: "Supplier Name",
      filter: "agTextColumnFilter",
    },
    { field: "type", headerName: "Type", filter: "agTextColumnFilter" },
    { field: "type1", headerName: "Type 1", filter: "agTextColumnFilter", hide: true },
    { field: "active", headerName: "Active", filter: "agTextColumnFilter", hide: true },
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

  filteredData: any[] = [];

  title = "QIR List";

  gridApi: GridApi;

  data: any[];

  id = null;

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
      this.onQuickSearchChange();
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
    },
    getRowId: (params) => params.data.id?.toString(),
  };

  onEdit(id) {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
      },
    });
  }

  onView(id) {
    this.router.navigate([NAVIGATION_ROUTE.VIEW], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
      },
    });
  }

  getActiveCount(): number {
    if (!this.data) return 0;
    return this.data.filter(item => item.active === 1 || item.active === '1' || item.active === true).length;
  }

  getResolvedCount(): number {
    if (!this.data) return 0;
    return this.data.filter(item => item.active === 0 || item.active === '0' || item.active === false).length;
  }

  getCurrentDate(): Date {
    return new Date();
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

      this.applyFilters();
      this.onQuickSearchChange();

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

  clearFilters(): void {
    this.selectedViewType = 'Open';
    this.quickSearchTerm = '';
    this.getData();
  }

  onQuickSearchChange(): void {
    if (!this.gridApi) {
      return;
    }

    this.gridApi.setGridOption('quickFilterText', this.quickSearchTerm.trim());
  }

  clearQuickSearch(): void {
    this.quickSearchTerm = '';
    this.onQuickSearchChange();
  }

  private applyFilters(): void {
    if (!this.data) {
      this.filteredData = [];
      return;
    }

    this.filteredData = [...this.data];
  }
}
