import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import {
  highlightRowView,
} from "src/assets/js/util";
import { CycleTimeService } from "@app/core/api/cycle-time/cycle-time.service";
import { EditIconComponent } from "@app/shared/ag-grid/edit-icon/edit-icon.component";
import { AuthenticationService } from "@app/core/services/auth.service";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-availability-list",
  templateUrl: "./availability-list.component.html",
  styleUrls: [],
})
export class AvailabilityListComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public api: CycleTimeService,
    public authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });
    this.getData();
  }

  query: any;

  setFilter = (q: string) => this.gridApi.setGridOption("quickFilterText", q);

  title = "Availability List";

  gridApi: GridApi;

  data: any[];

  id = null;

  onEdit(id) {
    this.router.navigate(["../edit"], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
      },
    });
  }

  columnDefs: ColDef[] = [
    // {
    //   field: "View",
    //   headerName: "View",
    //   filter: "agMultiColumnFilter",
    //   pinned: "left",
    //   cellRenderer: LinkRendererComponent,
    //   cellRendererParams: {
    //     onClick: (e: any) => this.onEdit(e.rowData.id),
    //     value: "SELECT",
    //   },
    //   maxWidth: 115,
    //   minWidth: 115,
    // },
    {
      field: "dueby",
      headerName: "Due By",
      filter: "agTextColumnFilter",
    },
    {
      field: "total_qty",
      headerName: "Open Qty",
      filter: "agTextColumnFilter",
    },
    {
      field: "data.employees",
      headerName: "Head Count",
      filter: "agMultiColumnFilter",
      editable: true,
      cellRenderer: EditIconComponent,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
    },
    getRowId: (params) => params.data.dueby?.toString(),
    onCellEditingStopped: (event) => {
      if (event.oldValue == event.newValue || event.value === undefined) return;
      this.update(event.data);
    },
  };

  public async update(data: any) {
    let item = data?.data;


    item.date = data.dueby;

    try {
      this.gridApi?.showLoadingOverlay();
      let res = await this.api.createAvailability(item);

      let rowNode = this.gridApi.getRowNode(data.dueby);
      rowNode.data.data = item;
      this.gridApi.redrawRows({ rowNodes: [rowNode] });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.data = await this.api.getAvailabilityList();
      this.router.navigate(["."], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
      });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
