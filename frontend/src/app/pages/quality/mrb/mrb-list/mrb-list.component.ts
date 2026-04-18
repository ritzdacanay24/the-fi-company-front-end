import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { MrbService } from "@app/core/api/quality/mrb-service";
import { NAVIGATION_ROUTE } from "../mrb-constant";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { MrbActionsCellRendererComponent } from "../mrb-actions-cell-renderer.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    GridSettingsComponent,
    GridFiltersComponent,
    BreadcrumbComponent,
    MrbActionsCellRendererComponent,
  ],
  selector: "app-mrb-list",
  templateUrl: "./mrb-list.component.html",
})
export class MrbListComponent implements OnInit {
  constructor(
    public api: MrbService,
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
      field: "Actions",
      headerName: "Actions",
      filter: false,
      sortable: false,
      pinned: "left",
      cellRenderer: MrbActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data.id),
      },
      maxWidth: 100,
      minWidth: 100,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter", hide: true },
    {
      field: "mrbNumber",
      headerName: "MRB Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "partNumber",
      headerName: "Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "partDescription",
      headerName: "Part Description",
      filter: "agMultiColumnFilter",
    },
    {
      field: "qtyRejected",
      headerName: "Qty Rejected",
      filter: "agMultiColumnFilter",
    },
    {
      field: "disposition",
      headerName: "Disposition",
      filter: "agMultiColumnFilter",
    },
    {
      field: "failureType",
      headerName: "Failure Type",
      filter: "agMultiColumnFilter",
    },
    {
      field: "type",
      headerName: "Type",
      filter: "agMultiColumnFilter",
    },
    {
      field: "wo_so",
      headerName: "WO/SO",
      filter: "agMultiColumnFilter",
    },
    {
      field: "dateReported",
      headerName: "Date Reported",
      filter: "agMultiColumnFilter",
    },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "comments",
      headerName: "Comments",
      filter: "agMultiColumnFilter",
      maxWidth: 200,
    },
    {
      field: "componentType",
      headerName: "Component Type",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "firstApproval",
      headerName: "First Approval",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "secondApproval",
      headerName: "Second Approval",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "itemCost",
      headerName: "Item Cost",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "lotNumber",
      headerName: "Lot Number",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    {
      field: "qirNumber",
      headerName: "QIR Number",
      filter: "agMultiColumnFilter",
      hide: true,
    },
    { field: "rma", headerName: "RMA", filter: "agMultiColumnFilter", hide: true },
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

  title = "MRB List";

  pageId = "/quality/mrb";

  searchName = "";

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = true;

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

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: "Quality", link: "/dashboard/quality" },
      { label: "MRB", active: true },
    ];
  }
}
