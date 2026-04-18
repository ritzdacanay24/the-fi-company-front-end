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
import moment from "moment";
import { NAVIGATION_ROUTE } from "../placard-constant";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { PlacardActionsCellRendererComponent } from "../placard-actions-cell-renderer/placard-actions-cell-renderer.component";
import { BreadcrumbItem, BreadcrumbComponent } from "@app/shared/components/breadcrumb/breadcrumb.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
    BreadcrumbComponent,
  ],
  selector: "app-placard-list",
  templateUrl: "./placard-list.component.html",
})
export class PlacardListComponent implements OnInit {
  constructor(
    public api: PlacardService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];

      this.id = params["id"];
      this.isAll = params["isAll"]
        ? params["isAll"].toLocaleLowerCase() === "true"
        : false;
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
    });

    this.getData();
  }

  columnDefs: ColDef[] = [
    {
      field: "Actions",
      headerName: "Actions",
      filter: false,
      sortable: false,
      pinned: "left",
      cellRenderer: PlacardActionsCellRendererComponent,
      cellRendererParams: {
        onView: (id: any) => this.onView(id),
        onEdit: (id: any) => this.onEdit(id),
      },
      maxWidth: 120,
      minWidth: 120,
    },
    {
      field: "eyefi_wo_number",
      headerName: "WO Number",
      filter: "agMultiColumnFilter",
      minWidth: 130,
    },
    {
      field: "eyefi_so_number",
      headerName: "SO Number",
      filter: "agMultiColumnFilter",
      minWidth: 130,
    },
    {
      field: "eyefi_part_number",
      headerName: "Part Number",
      filter: "agMultiColumnFilter",
      minWidth: 150,
    },
    {
      field: "description",
      headerName: "Description",
      filter: "agMultiColumnFilter",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "eyefi_serial_tag",
      headerName: "Serial Tag",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
      minWidth: 130,
    },
    {
      field: "customer_name",
      headerName: "Customer",
      filter: "agMultiColumnFilter",
      minWidth: 160,
    },
    {
      field: "qty",
      headerName: "Qty",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
      maxWidth: 90,
    },
    {
      field: "active",
      headerName: "Status",
      filter: "agMultiColumnFilter",
      maxWidth: 100,
    },
    {
      field: "created_date",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
      minWidth: 130,
    },
    // Hidden columns — available via column chooser
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter", hide: true },
    { field: "line_number", headerName: "Line Number", filter: "agMultiColumnFilter", hide: true },
    { field: "location", headerName: "Location", filter: "agMultiColumnFilter", hide: true },
    { field: "po_number", headerName: "PO Number", filter: "agMultiColumnFilter", cellDataType: "text", hide: true },
    { field: "customer_co_por_so", headerName: "Customer CP/POR/SO", filter: "agMultiColumnFilter", hide: true },
    { field: "customer_part_number", headerName: "Customer Part Number", filter: "agMultiColumnFilter", hide: true },
    { field: "customer_serial_tag", headerName: "Customer Serial Tag", filter: "agMultiColumnFilter", hide: true },
    { field: "label_count", headerName: "Label Count", filter: "agMultiColumnFilter", hide: true },
    { field: "total_label_count", headerName: "Total Label Count", filter: "agMultiColumnFilter", hide: true },
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

  title = "Placard List";

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = false;

  changeIsAll() {}

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
    this.router.navigate([NAVIGATION_ROUTE.SUMMARY], {
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

  getPendingCount(): number {
    if (!this.data) return 0;
    // Assuming placards have a status field for work order completion status
    return this.data.filter(item => 
      (!item.status || item.status.toLowerCase() === 'pending' || item.status.toLowerCase() === 'open' || item.status.toLowerCase() === 'in progress')
    ).length;
  }

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: "Operations", link: "/dashboard/operations" },
      { label: "Forms", link: "/operations/forms" },
      { label: "Work Order Placards", active: true },
    ];
  }
}
