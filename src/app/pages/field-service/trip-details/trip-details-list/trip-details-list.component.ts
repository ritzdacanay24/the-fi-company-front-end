import { Component, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ActivatedRoute, Router } from "@angular/router";
import { NgSelectModule } from "@ng-select/ng-select";
import { NAVIGATION_ROUTE } from "../trip-details-constant";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import moment from "moment";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";

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

  viewTripDetailById(id) {
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
      headerName: "View",
      filter: "agNumberColumnFilter",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e) => {
          this.viewTripDetailById(e.rowData.id);
        },
        value: "View",
      },
      pinned: "left",
      maxWidth: 115,
      minWidth: 115,
      suppressHeaderMenuButton: true,
      floatingFilter: false,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    { field: "fsId", headerName: "fsId", filter: "agMultiColumnFilter" },
    {
      field: "fs_travel_det_group",
      headerName: "fsId Group",
      filter: "agMultiColumnFilter",
    },
    { field: "address", headerName: "Address", filter: "agMultiColumnFilter" },
    { field: "address1", headerName: "STE", filter: "agMultiColumnFilter" },
    {
      field: "ciaddress_namety",
      headerName: "Address Name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "airline_name",
      headerName: "Airline Name",
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
    {
      field: "end_datetime_name",
      headerName: "end_datetime_name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "flight_in",
      headerName: "flight_in",
      filter: "agMultiColumnFilter",
    },
    {
      field: "flight_out",
      headerName: "flight_out",
      filter: "agMultiColumnFilter",
    },
    {
      field: "fs_travel_det_group",
      headerName: "fs_travel_det_group",
      filter: "agMultiColumnFilter",
    },
    {
      field: "location_name",
      headerName: "location_name",
      filter: "agMultiColumnFilter",
    },
    { field: "notes", headerName: "notes", filter: "agMultiColumnFilter" },
    {
      field: "rental_car_driver",
      headerName: "rental_car_driver",
      filter: "agMultiColumnFilter",
    },
    {
      field: "start_datetime",
      headerName: "start_datetime",
      filter: "agMultiColumnFilter",
    },
    {
      field: "start_datetime_name",
      headerName: "start_datetime_name",
      filter: "agMultiColumnFilter",
    },
    { field: "state", headerName: "state", filter: "agMultiColumnFilter" },
    {
      field: "zip_code",
      headerName: "zip_code",
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
