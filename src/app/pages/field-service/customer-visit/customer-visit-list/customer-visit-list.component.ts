import { ColDef, GridOptions } from "ag-grid-community";
import { GridApi } from "ag-grid-community";
import { Component, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgbDropdownModule, NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import moment from "moment";
import { SharedModule } from "@app/shared/shared.module";
import { CustomerVisitService } from "@app/core/api/field-service/customer-visit/customer-visit.service";
import { ActivatedRoute, Router } from "@angular/router";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbNavModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: "app-customer-visit-list",
  templateUrl: `./customer-visit-list.component.html`,
})
export class CustomerVisitListComponent implements OnInit {
  dateFrom = moment().subtract(1, "week").format("YYYY-MM-DD");
  dateTo = moment().format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];
  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  title = "Patient Claims";
  gridApi: GridApi;

  data: any[];

  isLoading = false;

  constructor(
    public customerVisitService: CustomerVisitService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getData();
  }

  view(id) {
    this.router.navigate([`../edit`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
      },
    });
  }

  columnDefs: ColDef[] = [
    {
      field: "",
      headerName: "View",
      filter: "agNumberColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.view(e.rowData.id);
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
      field: "end_time",
      headerName: "End Time",
      filter: "agMultiColumnFilter",
    },
    {
      field: "property_name",
      headerName: "Property Name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "start_date",
      headerName: "Start Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "start_time",
      headerName: "Start Time",
      filter: "agMultiColumnFilter",
    },
    { field: "techs", headerName: "Techs", filter: "agMultiColumnFilter" },
  ];

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.data = await this.customerVisitService.getAll();
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
  };

  async showFileUpload() {}

  async deleteAll() {}
}
