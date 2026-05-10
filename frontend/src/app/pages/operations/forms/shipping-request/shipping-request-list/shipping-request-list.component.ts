import { ColDef, ColGroupDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../shipping-request-constant";
import { BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { ShippingRequestService } from "@app/core/api/operations/shippging-request/shipping-request.service";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { ShippingRequestActionsCellRendererComponent } from "../shipping-request-actions-cell-renderer.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-shipping-request-list",
  templateUrl: "./shipping-request-list.component.html",
})
export class ShippingRequestListComponent implements OnInit {
  pageId = "/operations/forms/shipping-request/list";
  searchName = "";

  constructor(
    public api: ShippingRequestService,
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

  columnDefs: (ColDef | ColGroupDef)[] = [
    {
      field: "actions",
      headerName: "Actions",
      filter: false,
      sortable: false,
      pinned: "left",
      cellRenderer: ShippingRequestActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "status",
      headerName: "Status",
      filter: "agSetColumnFilter",
      minWidth: 150,
      maxWidth: 170,
      valueGetter: (params) => this.resolveStatus(params.data),
      cellRenderer: (params: any) => {
        const status = this.resolveStatus(params?.data);
        const badgeClass = this.getStatusBadgeClass(status);
        return `<span class="badge ${badgeClass}">${status}</span>`;
      },
    },
    {
      headerName: "Contact Info",
      children: [
        {
          field: "companyName",
          headerName: "Company Name",
          filter: "agMultiColumnFilter",
        },
        {
          field: "contactName",
          headerName: "Contact Name",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Shipping Info",
      children: [
        {
          field: "trackingNumber",
          headerName: "Tracking Number",
          filter: "agMultiColumnFilter",
        },
        {
          field: "freightCharges",
          headerName: "Freight Charges",
          filter: "agMultiColumnFilter",
        },
        {
          field: "phoneNumber",
          headerName: "Phone Number",
          filter: "agMultiColumnFilter",
          cellDataType: "text",
        },
        {
          field: "saturdayDelivery",
          headerName: "Saturday Delivery",
          filter: "agMultiColumnFilter",
        },
        {
          field: "sendTrackingNumberTo",
          headerName: "Send Tracking Number To",
          filter: "agMultiColumnFilter",
        },
        {
          field: "serviceType",
          headerName: "Service Type",
          filter: "agMultiColumnFilter",
        },
        {
          field: "serviceTypeName",
          headerName: "Service Type Name",
          filter: "agMultiColumnFilter",
        },
        {
          field: "thridPartyAccountNumber",
          headerName: "Thrid Party Account Number",
          filter: "agMultiColumnFilter",
        },
        { field: "cost", headerName: "Cost", filter: "agMultiColumnFilter" },
      ],
    },
    {
      headerName: "Address",
      children: [
        {
          field: "streetAddress",
          headerName: "Street Address",
          filter: "agMultiColumnFilter",
        },
        { field: "state", headerName: "State", filter: "agMultiColumnFilter" },
        { field: "city", headerName: "City", filter: "agMultiColumnFilter" },
        {
          field: "zipCode",
          headerName: "Zip Code",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Additional Information",
      children: [
        {
          field: "requestorName",
          headerName: "Requestor Name",
          filter: "agMultiColumnFilter",
        },
        {
          field: "emailAddress",
          headerName: "Email Address",
          filter: "agMultiColumnFilter",
        },
        {
          field: "completedBy",
          headerName: "Completed By",
          filter: "agMultiColumnFilter",
          cellDataType: "text",
        },
        {
          field: "completedDate",
          headerName: "Completed Date",
          filter: "agMultiColumnFilter",
        },
        {
          field: "createdById",
          headerName: "Created By Id",
          filter: "agMultiColumnFilter",
        },
        {
          field: "active",
          headerName: "Active",
          filter: "agMultiColumnFilter",
        },
      ],
    },
  ];

  @Input() selectedViewType = "Open";

  selectedViewOptions = [
    {
      name: "Open",
      selected: false,
    },
    {
      name: "In Transit",
      selected: false,
    },
    {
      name: "Completed",
      selected: false,
    },
    {
      name: "Cancelled",
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  title = "Shipping Request List";

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

  private resolveStatus(row: any): string {
    const persistedStatus = String(row?.status || "").trim();
    if (persistedStatus) {
      return persistedStatus;
    }

    if (row?.completedDate && row.completedDate !== "N/A") {
      return "Completed";
    }

    const trackingNumber = String(row?.trackingNumber || "").trim();
    if (trackingNumber && !["n/a", "na", "null", "none", "-"].includes(trackingNumber.toLowerCase())) {
      return "In Transit";
    }

    if (row?.active === false || Number(row?.active) === 0) {
      return "Cancelled";
    }

    return "Open";
  }

  private getStatusBadgeClass(status: string): string {
    switch (status) {
      case "Completed":
        return "bg-success";
      case "In Transit":
        return "bg-info";
      case "Cancelled":
        return "bg-danger";
      default:
        return "bg-warning";
    }
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();

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

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: "Operations", link: "/dashboard/operations" },
      { label: "Forms", link: "/operations/forms" },
      { label: "Shipping Requests", active: true },
    ];
  }
}
