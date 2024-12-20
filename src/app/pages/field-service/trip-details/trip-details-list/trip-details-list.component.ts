import { Component, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ActivatedRoute, Router } from "@angular/router";
import { NgSelectModule } from "@ng-select/ng-select";
import { NAVIGATION_ROUTE } from "../trip-details-constant";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import moment from "moment";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-trip-details-list",
  templateUrl: `./trip-details-list.component.html`,
})
export class TripDetailsListComponent implements OnInit {
  pageId = "/trip-details/list";
  average = 0;
  typeOfView = "Weekly";

  dateFrom = moment().subtract(6, "months").format("YYYY-MM-DD");
  dateTo = moment().format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  constructor(
    private api: TripDetailService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
      this.dateRange = [this.dateFrom, this.dateTo];
      this.displayCustomers = params["displayCustomers"];
      this.typeOfView = params["typeOfView"] || this.typeOfView;
    });

    if (!this.displayCustomers || this.displayCustomers != "Show All") {
      this.showAll = false;
    }
    if (!this.displayCustomers) {
      this.showAll = true;
    }

    this.getData();
  }

  viewTripDetailById(group_id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.SUMMARY_EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        group_id: group_id,
        gridParams,
      },
    });
  }

  editById(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
      },
    });
  }

  columnDefs: ColDef[] = [
    {
      field: "",
      headerName: "View Group",
      filter: "agNumberColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewTripDetailById(e.rowData.fs_travel_header_id);
        },
        value: "View Group",
      },
      pinned: "left",
      maxWidth: 90,
      minWidth: 90,
      suppressHeaderMenuButton: true,
      suppressFloatingFilterButton: true,
      suppressHeaderFilterButton: true,
      sortable: false,
      floatingFilter: false,
    },
    {
      field: "",
      headerName: "Edit",
      filter: "agNumberColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.editById(e.rowData.id);
        },
        value: "Edit",
      },
      pinned: "left",
      maxWidth: 65,
      minWidth: 65,
      suppressHeaderMenuButton: true,
      suppressFloatingFilterButton: true,
      suppressHeaderFilterButton: true,
      sortable: false,
      floatingFilter: false,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    { field: "fsId", headerName: "FSID", filter: "agMultiColumnFilter" },
    {
      field: "fs_travel_header_id",
      headerName: "Group ID",
      filter: "agMultiColumnFilter",
      rowGroup: true,
    },
    { field: "address", headerName: "Address", filter: "agMultiColumnFilter" },
    { field: "address1", headerName: "STE", filter: "agMultiColumnFilter" },
    {
      field: "address_name",
      headerName: "Address Name",
      filter: "agMultiColumnFilter",
    },
    { field: "city", headerName: "City", filter: "agMultiColumnFilter" },
    {
      field: "confirmation",
      headerName: "Confirmation",
      filter: "agMultiColumnFilter",
    },
    {
      field: "email_sent",
      headerName: "Email Sent",
      filter: "agMultiColumnFilter",
    },
    {
      field: "end_datetime",
      headerName: "End Date Time",
      filter: "agMultiColumnFilter",
    },
    // {
    //   field: "end_datetime_name",
    //   headerName: "end_datetime_name",
    //   filter: "agMultiColumnFilter",
    // },
    {
      field: "flight_in",
      headerName: "Flight In",
      filter: "agMultiColumnFilter",
    },
    {
      field: "flight_out",
      headerName: "Flight Out",
      filter: "agMultiColumnFilter",
    },
    {
      field: "location_name",
      headerName: "Location Name",
      filter: "agMultiColumnFilter",
    },
    { field: "notes", headerName: "Notes", filter: "agMultiColumnFilter" },
    {
      field: "rental_car_driver",
      headerName: "Rental Car Driver",
      filter: "agMultiColumnFilter",
    },
    {
      field: "start_datetime",
      headerName: "Start Time",
      filter: "agMultiColumnFilter",
    },
    {
      field: "start_datetime_name",
      headerName: "End Time",
      filter: "agMultiColumnFilter",
    },
    { field: "state", headerName: "State", filter: "agMultiColumnFilter" },
    {
      field: "zip_code",
      headerName: "Zip Code",
      filter: "agMultiColumnFilter",
    },
  ];

  gridOptions: GridOptions = {
    groupDefaultExpanded: 1,
    groupAllowUnbalanced: true,
    groupDisplayType: "groupRows",

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

  searchName = "";

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

  title = "Trip Details List";

  displayCustomers = "false";

  showAll = true;

  isLoading = false;

  async getData() {
    try {
      this.data = [];
      this.gridApi?.showLoadingOverlay();
      this.isLoading = true;

      let params: any = {};
      if (this.selectedViewType != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewType
        );
        params = { active: status.value };
      }

      this.data = await this.api.getAll();

      this.gridApi?.hideOverlay();
      this.isLoading = false;
    } catch (err) {
      this.gridApi?.hideOverlay();
      this.isLoading = false;
    }
  }
}
