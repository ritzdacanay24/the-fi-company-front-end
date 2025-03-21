import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../job-constant";
import { NgSelectModule } from "@ng-select/ng-select";
import { JobService } from "@app/core/api/field-service/job.service";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, NgSelectModule, DateRangeComponent],
  selector: "app-job-open-invoice",
  templateUrl: "./job-open-invoice.component.html",
})
export class JobOpenInvoiceComponent implements OnInit {
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
        : true;
    });
    this.getData();
  }

  isAll = true;

  previous_fsid;

  gridApi: GridApi;

  id = null;

  title = "Open Invoices";

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
    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: "merge",
      queryParams: {
        id: fsid,
        gridParams,
        start: this.dateFrom,
        end: this.dateTo,
        goBackUrl: NAVIGATION_ROUTE.INVOICE,
        active: 2,
      },
    });
  }

  billingView(fsid) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([`/dashboard/field-service/ticket/overview`], {
      queryParamsHandling: "merge",
      queryParams: {
        selectedViewType:'Open',
        isAll:true,
        id: fsid,
        gridParams,
        start: this.dateFrom,
        end: this.dateTo,
        goBackUrl: NAVIGATION_ROUTE.INVOICE,
        active: 7,
      },
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
        onClick: (e: any) => this.view(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    {
      field: "Billing View",
      headerName: "Billing View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.billingView(e.rowData.id),
        value: "View Billing",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "FSID", filter: "agMultiColumnFilter" },
    { field: "status", headerName: "Status", filter: "agMultiColumnFilter" },
    {
      field: "request_date",
      headerName: "Request Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "ticket_started",
      headerName: "Ticket #",
      filter: "agMultiColumnFilter",
    },
    {
      field: "dateSubmitted",
      headerName: "Ticket Submitted Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "review_status",
      headerName: "Billing Review Status",
      filter: "agMultiColumnFilter",
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
      this.gridApi?.showLoadingOverlay();
      this.data = await this.jobService.getOpenInvoice(
        this.dateFrom,
        this.dateTo,
        this.isAll
      );
      this.gridApi?.hideOverlay();
      this.router.navigate(["."], {
        relativeTo: this.activatedRoute,
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          isAll: this.isAll,
        },
        queryParamsHandling: "merge",
      });
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
