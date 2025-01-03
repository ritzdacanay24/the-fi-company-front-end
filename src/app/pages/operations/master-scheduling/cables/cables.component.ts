import { first } from "rxjs/operators";

import { Component, OnInit } from "@angular/core";
import { CablesService } from "@app/core/api/cables/cables.service";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { GridApi, GridOptions } from "ag-grid-community";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-cables",
  templateUrl: "./cables.component.html",
})
export class CablesComponent implements OnInit {
  data: any;
  sub: any;

  query;

  gridApi: GridApi;

  columnDefs = [
    { field: "WOD_NBR", headerName: "WO #", filter: "agMultiColumnFilter" },
    {
      field: "WO_PART",
      headerName: "WO Part #",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.openItemInfo(e.rowData.WO_PART),
        isLink: true,
      },
    },
    {
      field: "WOD_PART",
      headerName: "WOD Part #",
      filter: "agMultiColumnFilter",
    },
    {
      field: "WOD_QTY_REQ",
      headerName: "WO Qty Required",
      filter: "agMultiColumnFilter",
    },
    {
      field: "WOD_QTY_ISS",
      headerName: "WO Qty Issued",
      filter: "agMultiColumnFilter",
    },
    {
      field: "LD_QTY_OH",
      headerName: "Qty On Hand",
      filter: "agMultiColumnFilter",
    },
    {
      field: "WO_DUE_DATE",
      headerName: "WO Due Date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "WO_STATUS",
      headerName: "WO Status",
      filter: "agMultiColumnFilter",
    },
    {
      field: "POOPENQTY",
      headerName: "PO Open Qty",
      filter: "agMultiColumnFilter",
    },
    {
      field: "QTYNEEDED",
      headerName: "Qty Needed",
      filter: "agMultiColumnFilter",
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
    onGridReady: (params: any) => {
      this.gridApi = params.api;
      params.api.autoSizeAllColumns();
    },
  };

  openItemInfo = (workOrder) => {
    let modalRef = this.itemInfoModalService.open(workOrder);
    modalRef.result.then(
      (result: any) => {},
      () => {}
    );
  };

  constructor(
    private api: CablesService,
    private itemInfoModalService: ItemInfoModalService
  ) {}

  ngOnInit(): void {
    this.getData();
  }

  getData() {
    this.gridApi?.showLoadingOverlay();
    this.api
      .getData()
      .pipe(first())
      .subscribe(
        (data) => {
          this.gridApi?.hideOverlay();
          this.data = data;
        },
        (error) => this.gridApi?.hideOverlay()
      );
  }
}
