import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../qir-constant";
import { QirService } from "@app/core/api/quality/qir.service";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { QirActionsCellRendererComponent } from './qir-actions-cell-renderer.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
    GridSettingsComponent,
    GridFiltersComponent,
    QirActionsCellRendererComponent,
  ],
  selector: "app-qir-list",
  templateUrl: "./qir-list.component.html",
  styleUrls: ["./qir-list.component.scss"]
})
export class QirListComponent implements OnInit {
  pageId = "/qir/list-qir";

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

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];

      this.id = params["id"];
      this.isAll = params["isAll"]
        ? params["isAll"].toLocaleLowerCase() === "true"
        : this.isAll;
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
      this.selectedType1 = params["selectedType1"] || this.selectedType1;
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
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
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
    {
      field: "platformType",
      headerName: "Platform Type",
      filter: "agTextColumnFilter",
    },
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
    { field: "type1", headerName: "Type 1", filter: "agTextColumnFilter" },
    { field: "active", headerName: "Active", filter: "agTextColumnFilter" },
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

  // New Type 1 filter properties
  selectedType1 = "";
  type1Options: { value: string; label: string; count: number }[] = [];
  filteredData: any[] = [];

  title = "QIR List";

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = true;

  changeIsAll() { }

  dateFrom = moment()
    .subtract(1, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
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

  onView(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.VIEW], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
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
        this.dateFrom,
        this.dateTo,
        this.isAll
      );

      // Calculate Type 1 options with counts
      this.calculateType1Options();

      // Apply client-side filters
      this.applyFilters();

      this.router.navigate(["."], {
        queryParams: {
          selectedViewType: this.selectedViewType,
          selectedType1: this.selectedType1,
          isAll: this.isAll,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
        },
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
      });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  // New methods for improved filter UX
  hasActiveFilters(): boolean {
    return this.selectedViewType !== 'Open' || this.selectedType1 !== '' || (!this.isAll && this.dateRange && this.dateRange.length > 0);
  }

  clearFilters(): void {
    this.selectedViewType = 'Open'; // Default to Open instead of All
    this.selectedType1 = '';
    this.isAll = true;
    this.dateFrom = moment().subtract(1, "months").startOf("month").format("YYYY-MM-DD");
    this.dateTo = moment().endOf("month").format("YYYY-MM-DD");
    this.dateRange = [this.dateFrom, this.dateTo];
    this.getData();
  }

  clearStatusFilter(): void {
    this.selectedViewType = 'Open'; // Default back to Open
    this.getData();
  }

  clearType1Filter(): void {
    this.selectedType1 = '';
    this.getData();
  }

  clearDateFilter(): void {
    this.isAll = true;
    this.getData();
  }

  getDateRangeDisplay(): string {
    if (this.isAll) return 'All dates';
    return `${moment(this.dateFrom).format('MMM DD')} - ${moment(this.dateTo).format('MMM DD, YYYY')}`;
  }

  // Calculate Type 1 options with counts
  private calculateType1Options(): void {
    if (!this.data) {
      this.type1Options = [];
      return;
    }

    const type1Counts = new Map<string, number>();

    this.data.forEach(item => {
      const type1Value = item.type1 || 'Unspecified';
      type1Counts.set(type1Value, (type1Counts.get(type1Value) || 0) + 1);
    });

    this.type1Options = Array.from(type1Counts.entries())
      .map(([value, count]) => ({
        value: value === 'Unspecified' ? '' : value,
        label: value,
        count: count
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }

  // Apply client-side filtering
  private applyFilters(): void {
    if (!this.data) {
      this.filteredData = [];
      return;
    }

    this.filteredData = this.data.filter(item => {
      // Type 1 filter
      if (this.selectedType1 && this.selectedType1 !== '') {
        const itemType1 = item.type1 || '';
        if (itemType1 !== this.selectedType1) {
          return false;
        }
      }

      return true;
    });
  }
}
