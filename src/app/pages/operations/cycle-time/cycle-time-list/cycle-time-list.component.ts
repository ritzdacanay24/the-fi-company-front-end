import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import moment from "moment";
import {
  agGridDateFilterdateFilter,
  highlightRowView,
} from "src/assets/js/util";
import { CycleTimeService } from "@app/core/api/cycle-time/cycle-time.service";
import { EditIconComponent } from "@app/shared/ag-grid/edit-icon/edit-icon.component";
import { AuthenticationService } from "@app/core/services/auth.service";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent],
  selector: "app-cycle-time-list",
  templateUrl: "./cycle-time-list.component.html",
  styleUrls: [],
})
export class CycleTimeListComponent implements OnInit {
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

  title = "Cycle Time List";

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
      field: "pt_part",
      headerName: "Part",
      filter: "agTextColumnFilter",
    },
    {
      field: "pt_desc1",
      headerName: "Desc 1",
      filter: "agTextColumnFilter",
    },
    {
      field: "pt_desc2",
      headerName: "Desc 2",
      filter: "agTextColumnFilter",
    },
    {
      field: "pt_part_type",
      headerName: "Part Type",
      filter: "agTextColumnFilter",
    },
    {
      field: "pt_um",
      headerName: "UM",
      filter: "agTextColumnFilter",
    },
    {
      field: "cycleTime",
      headerName: "Cycle Time (HRS)",
      filter: "agMultiColumnFilter",
      editable: true,
      cellRenderer: EditIconComponent,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "updatedDate",
      headerName: "Updated date",
      filter: "agMultiColumnFilter",
    },
    {
      field: "updatedBy",
      headerName: "Updated By",
      filter: "agMultiColumnFilter",
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
    getRowId: (params) => params.data.pt_part?.toString(),
    onCellEditingStopped: (event) => {
      if (event.oldValue == event.newValue || event.value === undefined) return;
      this.update(event.data);
    },
  };

  public async update(data: any) {
    let item = data;

    item.partNumber = data.pt_part;
    item.updatedDate = moment().format("YYYY-MM-DD HH:mm:ss");
    item.updatedBy = this.authenticationService.currentUserValue.full_name;

    try {
      this.gridApi?.showLoadingOverlay();
      let res = await this.api.create(item);

      let rowNode = this.gridApi.getRowNode(data.pt_part);
      rowNode.data = item;
      this.gridApi.redrawRows({ rowNodes: [rowNode] });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      this.data = await this.api.getList();
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
