import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, ColGroupDef, GridApi, GridOptions } from "ag-grid-community";
import moment from "moment";
import { GraphicsBomService } from "@app/core/api/operations/graphics/graphics-bom.service";
import { NAVIGATION_ROUTE } from "../graphics-bom-constant";
import { ImageRendererComponent } from "@app/shared/ag-grid/cell-renderers/image-renderer/image-renderer.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    DateRangeComponent,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-graphics-bom-list",
  templateUrl: "./graphics-bom-list.component.html",
  styleUrls: [],
})
export class GraphicsBomListComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public api: GraphicsBomService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];
      this.id = params["id"];
    });

    this.getData();
  }

  query;

  pageId = "graphics-bom-list";

  title = "Graphics BOM List";

  dateFrom = moment()
    .subtract(0, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  gridApi: GridApi;

  data: any[];

  id = null;

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

  columnDefs: (ColDef | ColGroupDef)[] = [
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
    {
      headerName: "Basic Info",
      children: [
        {
          field: "ID_Product",
          headerName: "YFG Part Number",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Image_Data",
          headerName: "Image",
          filter: "agMultiColumnFilter",
          cellRenderer: ImageRendererComponent,
          cellRendererParams: {
            link: "https://dashboard.eye-fi.com/attachments_mount/Yellowfish/",
          },
        },
        {
          field: "Product",
          headerName: "Product Name",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Account_Vendor",
          headerName: "Account Name",
          filter: "agMultiColumnFilter",
        },
        {
          field: "SKU_Number",
          headerName: "Account Part #",
          filter: "agMultiColumnFilter",
        },
        {
          field: "DI_Product_SQL",
          headerName: "DI Product SQL",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Image_Data",
          headerName: "Image Data",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Manufacturer",
          headerName: "Manufacturer",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Date_Purchased",
          headerName: "Date Purchased",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Age_In_Years",
          headerName: "Age In Years",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Serial_Number",
          headerName: "Serial Number",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Purchased_From",
          headerName: "Purchased From",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Category",
          headerName: "Category",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Catalog_Item",
          headerName: "Catalog Item",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Taxable",
          headerName: "Taxable",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Keywords",
          headerName: "Keywords",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Location",
          headerName: "Location",
          filter: "agMultiColumnFilter",
        },
        { field: "Cost", headerName: "Cost", filter: "agMultiColumnFilter" },
        {
          field: "Reorder_Level",
          headerName: "Reorder Level",
          filter: "agMultiColumnFilter",
        },
        { field: "Price", headerName: "Price", filter: "agMultiColumnFilter" },
        {
          field: "Unit_Weight",
          headerName: "Unit Weight",
          filter: "agMultiColumnFilter",
        },
        {
          field: "margin",
          headerName: "Margin",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Status",
          headerName: "Status",
          filter: "agMultiColumnFilter",
        },
        {
          field: "Unit_Dimensions",
          headerName: "Unit Dimensions",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Digital Info",
      children: [
        { field: "DD1_1", headerName: "Film", filter: "agMultiColumnFilter" },
        {
          field: "DD1_2",
          headerName: "# Images",
          filter: "agMultiColumnFilter",
        },
        { field: "DD1_3", headerName: "DD1_3", filter: "agMultiColumnFilter" },
        { field: "DD1_4", headerName: "DD1_4", filter: "agMultiColumnFilter" },
        {
          field: "DD1_5",
          headerName: "TIF Size",
          filter: "agMultiColumnFilter",
        },
        { field: "DD1_6", headerName: "DD1_6", filter: "agMultiColumnFilter" },
        {
          field: "DD1_7",
          headerName: "Assembly Notes",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Production Info",
      children: [
        {
          field: "DD2_1",
          headerName: "Substrate",
          filter: "agMultiColumnFilter",
        },
        { field: "DD2_2", headerName: "Size", filter: "agMultiColumnFilter" },
        { field: "DD2_3", headerName: "DD2_3", filter: "agMultiColumnFilter" },
        { field: "DD2_4", headerName: "DD2_4", filter: "agMultiColumnFilter" },
        { field: "DD2_5", headerName: "DD2_5", filter: "agMultiColumnFilter" },
        {
          field: "DD2_6",
          headerName: "Production",
          filter: "agMultiColumnFilter",
        },
        { field: "DD2_7", headerName: "1st", filter: "agMultiColumnFilter" },
        { field: "DD2_8", headerName: "2nd", filter: "agMultiColumnFilter" },
        { field: "DD2_9", headerName: "3rd", filter: "agMultiColumnFilter" },
      ],
    },
    {
      headerName: "Assembly Info",
      children: [
        {
          field: "DD3_1",
          headerName: "1st Surf Lam",
          filter: "agMultiColumnFilter",
        },
        {
          field: "DD3_2",
          headerName: "2nd Surf Lam",
          filter: "agMultiColumnFilter",
        },
        {
          field: "DD3_3",
          headerName: "Mounting",
          filter: "agMultiColumnFilter",
        },
        { field: "DD3_4", headerName: "DD3_4", filter: "agMultiColumnFilter" },
        { field: "DD3_5", headerName: "DD3_5", filter: "agMultiColumnFilter" },
        { field: "DD3_6", headerName: "Meter", filter: "agMultiColumnFilter" },
        { field: "DD3_7", headerName: "DD3_7", filter: "agMultiColumnFilter" },
        {
          field: "DD3_8",
          headerName: "Cutting Type",
          filter: "agMultiColumnFilter",
        },
        {
          field: "DD3_9",
          headerName: "Template/Die",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      field: "Date_Created",
      headerName: "Date Created",
      filter: "agMultiColumnFilter",
    },
    {
      field: "Date_Modified",
      headerName: "Date Modified",
      filter: "agMultiColumnFilter",
    },
    {
      field: "UserName_Created",
      headerName: "Username Created",
      filter: "agMultiColumnFilter",
    },
    {
      field: "UserName_Modified",
      headerName: "Username Modified",
      filter: "agMultiColumnFilter",
    },
  ];

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
    onFilterChanged: (params) => this.updateUrl(params),
    onSortChanged: (params) => this.updateUrl(params),
    getRowId: (params) => params.data.id?.toString(),
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
      this.data = await this.api.getList(this.dateFrom, this.dateTo);
      this.router.navigate(["."], {
        queryParams: {
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
