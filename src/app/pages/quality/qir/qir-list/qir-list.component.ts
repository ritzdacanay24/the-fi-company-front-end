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
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";

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
  ],
  selector: "app-qir-list",
  templateUrl: "./qir-list.component.html",
})
export class QirListComponent implements OnInit {
  pageId = "/qir/list-qir";

  constructor(
    public api: QirService,
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
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
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

  title = "QIR List";

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

      this.router.navigate(["."], {
        queryParams: {
          selectedViewType: this.selectedViewType,
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
}
