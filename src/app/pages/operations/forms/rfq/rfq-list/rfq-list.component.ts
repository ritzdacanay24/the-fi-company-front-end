import { ColDef, GridApi, GridOptions } from "ag-grid-community";
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
import moment from "moment";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { NAVIGATION_ROUTE } from "../rfq-constant";
import { RfqService } from "@app/core/api/rfq/rfq-service";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
  ],
  selector: "app-rfq-list",
  templateUrl: "./rfq-list.component.html",
})
export class RfqListComponent implements OnInit {
  constructor(
    public api: RfqService,
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
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "SELECT",
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
