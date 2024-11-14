import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ItemService } from "@app/core/api/operations/item/item.service";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { WorkOrderInfoModalService } from "@app/shared/components/work-order-info-modal/work-order-info-modal.component";
import {
  ColDef,
  ColGroupDef,
  DateStringAdvancedFilterModel,
  GridApi,
  GridOptions,
} from "ag-grid-community";
import { LocationLookupService } from "@app/core/api/location-lookup/location-lookup.service";
import { Router, ActivatedRoute } from "@angular/router";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-location-lookup",
  templateUrl: `./location-lookup.component.html`,
  styleUrls: [],
})
export class LocationLookupComponent {
  constructor(
    private api: LocationLookupService,
    public router: Router,
    public activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.location = params["location"];
      if (this.location) {
        this.getData();
      }
    });
  }

  @Input() location: string;
  isLoading = false;

  columnDefs: ColDef[] = [
    { field: "ld_part", headerName: "Part #", filter: "agTextColumnFilter" },
    { field: "pt_desc1", headerName: "Desc1", filter: "agTextColumnFilter" },
    { field: "pt_desc2", headerName: "Desc2", filter: "agTextColumnFilter" },
    { field: "pt_um", headerName: "UM", filter: "agTextColumnFilter" },
    { field: "ld_qty_oh", headerName: "Qty OH", filter: "agTextColumnFilter" },
    { field: "ld_status", headerName: "Status", filter: "agTextColumnFilter" },
    { field: "ld_loc", headerName: "Location", filter: "agTextColumnFilter" },
    { field: "ld_lot", headerName: "Lot/Serial", filter: "agTextColumnFilter" },
    {
      field: "ld_date",
      headerName: "Location Date",
      filter: "agTextColumnFilter",
    },
    { field: "ld_ref", headerName: "Reference", filter: "agTextColumnFilter" },
    { field: "ld_rev", headerName: "Revision", filter: "agTextColumnFilter" },
  ];

  gridApi: GridApi;

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params) => {
      this.gridApi = params.api;
    },
  };

  data = [];
  getData = async () => {
    try {
      this.isLoading = true;
      let data = (this.data = await this.api.getLocation(this.location));

      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: {
          location: this.location,
        },
      });

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  };
}
