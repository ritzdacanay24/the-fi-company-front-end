import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { MasterProductionComponent } from "../master-production/master-production.component";
import { TableSettingsService } from "@app/core/api/table-settings/table-settings.service";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridApi } from "ag-grid-community";
import { MasterSchedulingService } from "@app/core/api/operations/master-scheduling/master-scheduling.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MasterProductionComponent,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-production-routing",
  templateUrl: "./production-routing.component.html",
  styleUrls: [],
})
export class ProductionRoutingComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public activatedRoute: ActivatedRoute,
    private tableSettingsService: TableSettingsService,
    private api: MasterSchedulingService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.routing = params["routing"] || this.routing;
    });
    this.getData();
  }

  query;
  defaultFilters = [
    {
      id: -1,
      name: "Future Orders",
      data: {
        "status_info.status_text": {
          values: ["Future Order"],
          filterType: "set",
        },
      },
    },
    {
      id: -2,
      name: "Past Due Orders",
      data: {
        "status_info.status_text": {
          values: ["Past Due"],
          filterType: "set",
        },
      },
    },
  ];

  routing = 20;

  id = null;

  pageId = "/master-scheduling/production";

  title: string = "Production Routing";

  icon = "mdi-account-group";

  data;

  gridApi: GridApi;

  setGridApi($event) {
    this.gridApi = $event.api;
  }

  tableList: any;
  currentTableView: any;
  async getTableSettings() {
    this.tableList = await this.tableSettingsService.getTableByUserId({
      pageId: this.pageId,
    });
    this.gridApi!.applyColumnState({
      state: this.tableList.currentView.data,
      applyOrder: true,
    });
  }

  getData = async () => {
    await this.getTableSettings();
    try {
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: {
          routing: this.routing,
        },
      });
      this.gridApi?.showLoadingOverlay();
      this.data = await this.api.getMasterProduction(this.routing);

      if (this.gridApi.isDestroyed()) return;
      this.gridApi!.redrawRows();

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  };
}
