import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../job-constant";
import { NAVIGATION_ROUTE as TICKET_NAVIGATION_ROUTE } from "../../ticket/ticket-constant";
import { NAVIGATION_ROUTE as REQUEST_NAVIGATION_ROUTE } from "../../request/request-constant";
import { NgSelectModule } from "@ng-select/ng-select";
import { JobService } from "@app/core/api/field-service/job.service";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import {
  currencyFormatter,
  highlightRowView,
  autoSizeColumns,
} from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    DateRangeComponent,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-job-list",
  templateUrl: "./job-list.component.html",
})
export class JobListComponent implements OnInit {
  pageId = "/field-service/list-jobs";

  constructor(
    public router: Router,
    private jobService: JobService,
    public activatedRoute: ActivatedRoute
  ) {}

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
    });

    this.getData();
  }

  isAll = true;

  previous_fsid;

  theme = "ag-theme-quartz";

  gridApi: GridApi;

  id = null;

  title = "Jobs";

  dateFrom = moment().startOf("month").format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  @Input() selectedViewType = "Open";

  selectedViewOptions = [
    {
      name: "Open",
      value: "Open",
      selected: false,
    },
    {
      name: "Completed",
      value: "Completed",
      selected: false,
    },
    {
      name: "All",
      value: "All",
      selected: false,
    },
  ];

  changeIsAll() {
    this.router.navigate(["."], {
      relativeTo: this.activatedRoute,
      queryParams: {
        isAll: this.isAll,
      },
      queryParamsHandling: "merge",
    });
    this.getData();
  }

  view(fsid) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: fsid,
        gridParams,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        goBackUrl: NAVIGATION_ROUTE.LIST,
      },
    });
  }

  viewTicket(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([TICKET_NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        goBackUrl: NAVIGATION_ROUTE.LIST,
      },
    });
  }

  viewBilling(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.BILLING], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        goBackUrl: NAVIGATION_ROUTE.LIST,
      },
    });
  }

  viewRequest(id, request_id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([REQUEST_NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        request_id: request_id,
        gridParams,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        goBackUrl: NAVIGATION_ROUTE.LIST,
      },
    });
  }

  query;

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.view(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    {
      field: "customer",
      headerName: "Customer",
      filter: "agMultiColumnFilter",
    },
    { field: "id", headerName: "FSID", filter: "agMultiColumnFilter" },
    {
      field: "request_id",
      headerName: "Request ID",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        isLink: true,
        onClick: (e: any) =>
          this.viewRequest(e.rowData.id, e.rowData.request_id),
      },
    },
    {
      field: "workOrderTicketId",
      headerName: "Work Order ID",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        isLink: true,
        onClick: (e: any) => this.viewTicket(e.rowData.id),
      },
    },
    {
      field: "id",
      headerName: "Billing",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        isLink: true,
        onClick: (e: any) => this.viewBilling(e.rowData.id),
      },
    },
    {
      field: "days_before_service",
      headerName: "Age",
      filter: "agMultiColumnFilter",
    },
    {
      field: "property",
      headerName: "Property",
      filter: "agMultiColumnFilter",
    },
    { field: "state", headerName: "State", filter: "agMultiColumnFilter" },
    { field: "fs_lat", headerName: "Latitude", filter: "agMultiColumnFilter" },
    { field: "fs_lon", headerName: "Longitude", filter: "agMultiColumnFilter" },
    { field: "status", headerName: "Status", filter: "agSetColumnFilter" },
    {
      field: "request_date",
      headerName: "Request Date",
      filter: "agSetColumnFilter",
    },
    {
      field: "start_time",
      headerName: "Start Time",
      filter: "agSetColumnFilter",
    },
    {
      field: "contractor_codes",
      headerName: "Contractor Code",
      filter: "agSetColumnFilter",
    },
    {
      field: "zone_codes",
      headerName: "Zone Code",
      filter: "agSetColumnFilter",
    },
    {
      field: "invoice",
      headerName: "Invoice Amount",
      filter: "agNumberColumnFilter",
      pinned: "right",
      valueFormatter: currencyFormatter,
    },
    { field: "active", headerName: "Active", filter: "agSetColumnFilter" },
    {
      field: "notice_email_date",
      headerName: "Notice Email Date",
      filter: "agSetColumnFilter",
    },
    {
      field: "service_type",
      headerName: "Service",
      filter: "agSetColumnFilter",
    },
    {
      field: "sales_order_number",
      headerName: "SO #",
      filter: "agSetColumnFilter",
    },
    {
      field: "sign_type",
      headerName: "Sign Type",
      filter: "agSetColumnFilter",
    },
    {
      field: "sign_theme",
      headerName: "Sign Theme",
      filter: "agSetColumnFilter",
    },
    {
      field: "out_of_state",
      headerName: "Out Of State",
      filter: "agSetColumnFilter",
    },
    {
      field: "createdByUserName",
      headerName: "Job Created By",
      filter: "agSetColumnFilter",
    },
    {
      field: "created_date",
      headerName: "Job Created Date",
      filter: "agSetColumnFilter",
    },
    {
      field: "cancellation_comments",
      headerName: "Cancelled Comments",
      filter: "agSetColumnFilter",
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
    getRowId: (params) => params.data.id?.toString(),
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

  data: any = [];
  async getData() {
    try {
      if (this.selectedViewType == "Open") {
        this.isAll = true;
      }

      this.gridApi?.showLoadingOverlay();
      this.data = await this.jobService.getAllRequests(
        this.dateFrom,
        this.dateTo,
        this.selectedViewType,
        this.isAll
      );
      this.gridApi?.hideOverlay();
      this.router.navigate(["."], {
        relativeTo: this.activatedRoute,
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          selectedViewType: this.selectedViewType,
        },
        queryParamsHandling: "merge",
      });
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
