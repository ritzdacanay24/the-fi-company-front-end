import { Component, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ActivatedRoute, Router } from "@angular/router";
import { NgSelectModule } from "@ng-select/ng-select";
import { NAVIGATION_ROUTE } from "../ticket-constant";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { TicketModalService } from "../ticket-modal/ticket-modal.component";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { TicketActionsCellRendererComponent } from "../ticket-actions-cell-renderer.component";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, NgSelectModule, GridSettingsComponent, GridFiltersComponent, BreadcrumbComponent],
  selector: "app-ticket-list",
  templateUrl: `./ticket-list.component.html`,
})
export class TicketListComponent implements OnInit {
  pageId = "/field-service/list-tickets";
  searchName = "";

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Field Service', link: '/dashboard/field-service' },
      { label: 'Tickets' },
    ];
  }

  constructor(
    private api: WorkOrderService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
    private ticketModalService: TicketModalService
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
      cellRenderer: TicketActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.openWorkOrder(data.fs_scheduler_id),
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "Ticket ID", filter: "agMultiColumnFilter", hide: true },
    {
      field: "fs_scheduler_id",
      headerName: "FSID",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "request_date",
      headerName: "Request Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "createdDate",
      headerName: "Ticket Created Date",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "customerName1",
      headerName: "Customer name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "dateSubmitted",
      headerName: "Date Submitted",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "workCompleted",
      headerName: "Work Completed",
      filter: "agMultiColumnFilter",
    },
    { field: "status", headerName: "Status", filter: "agMultiColumnFilter" },
    {
      field: "workCompletedComment",
      headerName: "Comments",
      filter: "agMultiColumnFilter",
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
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

  selectedViewType = "Open";

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

  data: any;

  id: any;

  gridApi: GridApi;

  title = "Ticket List";

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();

      this.data = await this.api.getAllRequests(
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

  openWorkOrder(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
      },
    });
  }
}
