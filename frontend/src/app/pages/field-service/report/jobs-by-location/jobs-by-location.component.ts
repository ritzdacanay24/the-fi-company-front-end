import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AgGridModule } from "ag-grid-angular";
import { GridApi, GridOptions } from "ag-grid-community";
import moment from "moment";
import { ReportService } from "src/app/core/api/field-service/report.service";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "src/app/shared/shared.module";
import { autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent],
  selector: "app-jobs-by-location",
  templateUrl: "./jobs-by-location.component.html",
  styleUrls: [],
})
export class JobsByLocationComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public reportService: ReportService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];
    });
    this.getData();
  }

  title = "Jobs By Location";

  dateFrom = moment()
    .subtract(6, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");

  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];

    this.router.navigate(["."], {
      queryParams: {
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
      },
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });

    this.getData();
  }

  gridApi: GridApi;

  data: any[] = [];

  columnDefs: any = [
    { field: "hits", headerName: "Total Jobs", filter: "agMultiColumnFilter" },
    {
      field: "property",
      headerName: "Property",
      filter: "agMultiColumnFilter",
    },
    { field: "city", headerName: "City", filter: "agMultiColumnFilter" },
    { field: "state", headerName: "State", filter: "agMultiColumnFilter" },
  ];

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
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

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.data = await this.reportService.jobByLocation(
        this.dateFrom,
        this.dateTo
      );
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
