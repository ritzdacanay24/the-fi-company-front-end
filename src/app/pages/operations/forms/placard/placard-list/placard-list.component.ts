import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { SharedModule } from "@app/shared/shared.module";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../placard-constant";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
  ],
  selector: "app-placard-list",
  templateUrl: "./placard-list.component.html",
})
export class PlacardListComponent implements OnInit {
  constructor(
    public api: PlacardService,
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
      field: "eyefi_part_number",
      headerName: "Eyefi Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "description",
      headerName: "Description",
      filter: "agMultiColumnFilter",
    },
    {
      field: "eyefi_serial_tag",
      headerName: "Eyefi Serial Tag",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "eyefi_so_number",
      headerName: "Eyefi SO Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "eyefi_wo_number",
      headerName: "Eyefi WO Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "line_number",
      headerName: "Line Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "location",
      headerName: "Location",
      filter: "agMultiColumnFilter",
    },
    {
      field: "po_number",
      headerName: "PO Number",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "qty",
      headerName: "Qty",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "customer_co_por_so",
      headerName: "Customer CP/POR/SO",
      filter: "agMultiColumnFilter",
    },
    {
      field: "customer_name",
      headerName: "Customer Name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "customer_part_number",
      headerName: "Customer Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "customer_serial_tag",
      headerName: "Customer Serial Tag",
      filter: "agMultiColumnFilter",
    },
    {
      field: "label_count",
      headerName: "Label Count",
      filter: "agMultiColumnFilter",
    },
    {
      field: "total_label_count",
      headerName: "Total Label Count",
      filter: "agMultiColumnFilter",
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
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
