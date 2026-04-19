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
import { BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { NAVIGATION_ROUTE } from "../rfq-constant";
import { RfqService } from "@app/core/api/rfq/rfq-service";
import { RfqActionsCellRendererComponent } from "../rfq-actions-cell-renderer.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-rfq-list",
  templateUrl: "./rfq-list.component.html",
})
export class RfqListComponent implements OnInit {
  pageId = "/operations/forms/rfq/list";

  constructor(
    public api: RfqService,
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
      cellRenderer: RfqActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "subjectLine",
      headerName: "Subject Line",
      filter: "agMultiColumnFilter",
    },
    { field: "address", headerName: "Address", filter: "agMultiColumnFilter" },
    {
      field: "appointmentRequired",
      headerName: "Appointment Required",
      filter: "agMultiColumnFilter",
    },
    {
      field: "descriptionOfProduct",
      headerName: "Description Of Product",
      filter: "agMultiColumnFilter",
    },
    {
      field: "puNumber",
      headerName: "PU Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "poNumber",
      headerName: "PO Number",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "readyDateTime",
      headerName: "Ready Date Time",
      filter: "agMultiColumnFilter",
    },
    {
      field: "requestorName",
      headerName: "Requestor Name",
      filter: "agMultiColumnFilter",
    },
    { field: "value", headerName: "Value", filter: "agMultiColumnFilter" },
    {
      field: "weight",
      headerName: "Weight",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "created_by",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
    },
    {
      field: "created_date",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "email_sent_date",
      headerName: "Email Sent Date",
      filter: "agMultiColumnFilter",
    },
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

  title = "RFQ List";

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

  // Helper methods for statistics display
  getPendingCount(): number {
    if (!this.data) return 0;
    // Assuming RFQs are pending if they're active and don't have a completion status
    return this.data.filter(item => 
      (item.active === 1 || item.active === true || item.active === '1') && 
      (!item.status || item.status.toLowerCase() === 'pending' || item.status.toLowerCase() === 'open')
    ).length;
  }

  getCompletedCount(): number {
    if (!this.data) return 0;
    // Assuming RFQs are completed if they have a completion status
    return this.data.filter(item => 
      item.status && (item.status.toLowerCase() === 'completed' || item.status.toLowerCase() === 'closed' || item.status.toLowerCase() === 'awarded')
    ).length;
  }

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: "Operations", link: "/operations" },
      { label: "Forms", link: "/operations/forms" },
      { label: "Request for Quote (RFQ)", active: true },
    ];
  }
}
