import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { NgSelectModule } from "@ng-select/ng-select";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";

import { labelData } from "../labels";
import { CustomerLabelModalService } from "../customer-label-modal/customer-label-modal.component";
import { PartInformationLabelModalService } from "../part-information-label-modal/part-information-label-modal.component";
import { KitLabelModalService } from "../kit-label-modal/kit-label-modal.component";
import { LocationLabelModalService } from "../location-label-modal/location-label-modal.component";
import { JustLabelModalService } from "../just-label-modal/just-label-modal.component";

import tippy from "tippy.js";
import { IssueToWorkOrderLabelModalService } from "../issue-to-work-order-label-modal/issue-to-work-order-label-modal.component";
import { PartInformationLabelLgModalService } from "../part-information-label-lg-modal/part-information-label-lg-modal.component";
import { AgsLabelModalService } from "../ags-label-modal/ags-label-modal.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { PartInformationLabelModalSmService } from "../part-information-label-modal-sm/part-information-label-modal-sm.component";
import { PartAndSNModalService } from "../part-and-sn-modal/part-and-sn-modal.component";
import { SNULAssetModalService } from "../sn-ul-asset-modal/sn-ul-asset-modal.component";
import { ContinuityModalService } from "../continuity-test-modal/continuity-test-modal.component";
import { TotalLabelsModalService } from "../total-labels-modal/total-labels-modal.component";

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-labels-list",
  templateUrl: "./labels-list.component.html",
})
export class LabelsListComponent implements OnInit {
  pageId = "/list-labels";

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
    private customerLabelModalService: CustomerLabelModalService,
    private partInformationLabelModalService: PartInformationLabelModalService,
    private kitLabelModalService: KitLabelModalService,
    private locationLabelModalService: LocationLabelModalService,
    private justLabelModalService: JustLabelModalService,
    private issueToWorkOrderLabelModalService: IssueToWorkOrderLabelModalService,
    private partInformationLabelLgModalService: PartInformationLabelLgModalService,
    private agsLabelModalService: AgsLabelModalService,
    private partInformationLabelModalSmService: PartInformationLabelModalSmService,
    private partAndSNModalService: PartAndSNModalService,
    private sNULAssetModalService: SNULAssetModalService,
    private continuityModalService: ContinuityModalService,
    private totalLabelsModalService: TotalLabelsModalService
  ) { }

  ngOnInit(): void {
    this.getData();
  }

  searchName = "";

  gridApi: GridApi;

  id = null;

  title = "Labels";

  view(data) {
    this[data.service].open(data);
  }

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.view(e.rowData),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "labelName",
      headerName: "Label Name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "labelSize",
      headerName: "Label Size",
      filter: "agMultiColumnFilter",
    },
    {
      field: "orientation",
      headerName: "Orientation",
      filter: "agMultiColumnFilter",
    },
    {
      field: "labelImage",
      headerName: "Image",
      filter: "agMultiColumnFilter",
      cellRenderer: (params) => {
        let image = params.value;

        tippy(params.eGridCell, {
          arrow: false,
          content: `
            <div class="card shadow-lg">
              <div class="card-header d-flex align-items-center">
              <h4 class="card-title mb-0 me-3">${params.data.labelName}</h4> <br/>
              <h4 class="card-title mb-0 ms-auto">${params.data.labelSize}</h4>
              </div>
              <div class="card-body text-center" style="overflow:hidden">
              <img class="rounded" src="${image}" style="width:250px" />
              </div>
            </div>
          `,
          placement: "bottom-start",
          allowHTML: true,
          theme: "light",
          offset: [20, -3],
          trigger: "mouseenter",
        });

        return `<img class="rounded img-thumbnail" src="${image}" style="width:20px;height:20px" />`;
      },
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
    getRowId: (params) => params.data.id?.toString(),
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
    },
  };

  data: any = [];
  async getData() {
    this.data = labelData;
  }
}
