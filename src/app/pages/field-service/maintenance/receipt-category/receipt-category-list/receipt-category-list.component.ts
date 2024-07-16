import { GridApi } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgbDropdownModule, NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { NAVIGATION_ROUTE } from "../receipt-category-constant";
import { ReceiptCategoryService } from "@app/core/api/field-service/receipt-category.service";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";

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
  selector: "app-receipt-category-list",
  templateUrl: "./receipt-category-list.component.html",
})
export class ReceiptCategoryListComponent implements OnInit {
  constructor(
    public api: ReceiptCategoryService,
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

  columnDefs: any = [
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
    {
      field: "category",
      headerName: "Category",
      filter: "agMultiColumnFilter",
      cellStyle: (params) => {
        return {
          "border-left": `9px solid ${params.data.background_color}`,
          "font-weight": "bold",
        };
      },
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "icon",
      headerName: "Icon",
      filter: "agMultiColumnFilter",
      cellRenderer: (params) => {
        return `<i style="font-size:20px;" class="${params.value}"></i>`;
      },
    },
    {
      field: "description",
      headerName: "Description",
      filter: "agMultiColumnFilter",
    },
    {
      field: "accounting_code",
      headerName: "Accounting Code",
      filter: "agMultiColumnFilter",
    },
    {
      field: "background_color",
      headerName: "Background Color",
      filter: "agMultiColumnFilter",
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
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

  title = "Receipt Categories";

  gridApi: GridApi;

  data: any[];

  id = null;

  gridOptions = {
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

      this.data = await this.api.find(params);

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
}
