import { Component } from "@angular/core";
import { AuthenticationService } from "@app/core/services/auth.service";
import { IToolPanelAngularComp } from "ag-grid-angular";
import { GridApi, IToolPanelParams } from "ag-grid-community";
import { NgSelectModule } from "@ng-select/ng-select";
import { autoSizeColumnsApi } from "src/assets/js/util";
import { FullTextSearchPipe } from "@app/shared/pipes/full-text-search.pipe";
import { SharedModule } from "@app/shared/shared.module";
import { TableFilterSettingsService } from "@app/core/api/table-filter-settings/table-filter-settings.component";
import { GridFiltersModalService } from "@app/shared/grid-filters/grid-filters-modal/grid-filters-modal.component";
import { GridFiltersEditModalService } from "@app/shared/grid-filters/grid-filters-edit-modal/grid-filters-edit-modal.component";
import { Router } from "@angular/router";

export interface CustomStatsToolPanelParams extends IToolPanelParams {
  title: string;
}

@Component({
  standalone: true,
  imports: [SharedModule, NgSelectModule, FullTextSearchPipe],
  templateUrl: `./grid-filters-tool-panel.component.html`,
  styleUrl: `./grid-filters-tool-panel.component.scss`,
})
export class GridFiltersToolPanel implements IToolPanelAngularComp {
  query = "";

  clearFilters() {
    this.value = null;
    this.gridApi.setFilterModel(null);
    this.gridApi.onFilterChanged();
  }

  checkFiltersApplied(data) {
    return Object.keys(JSON.parse(data)).length;
  }

  async update() {
    const savedState = this.gridApi.getFilterModel();

    let saveData = {
      data: JSON.stringify(savedState),
    };

    this.currentUserGrids = this.currentUserGrids.map((pilot) => {
      if (this.value == pilot.id) pilot.data = JSON.stringify(savedState);
      return pilot;
    });

    await this.tableFilterSettingsService.saveTableSettings(
      this.value,
      saveData
    );
  }

  isAdvanceFilterOn = false;
  showAdvanceFilter() {
    this.gridApi.updateGridOptions({
      enableAdvancedFilter: (this.isAdvanceFilterOn = !this.isAdvanceFilterOn),
    });
  }

  viewAll() {
    let inst = this.gridFiltersEditModalService.open(this.pageId);
    inst.result.then(
      (result) => {
        this.currentUserGrids = result;

        result.map((pilot) => {
          if (this.value == pilot.id) this.currentView = pilot;
          return pilot;
        });
      },
      () => {}
    );
  }

  openUp() {
    setTimeout(() => {
      let el = document.getElementById("test-" + this.value);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 200);
  }

  updateToDefault() {
    this.gridApi?.showLoadingOverlay();
    this.value = null;
    this.currentView = null;

    setTimeout(() => {
      this.gridApi.resetColumnState();
      autoSizeColumnsApi(this.gridApi);
      this.gridApi?.hideOverlay();
    }, 500);
  }

  createNewView() {
    const savedState = this.gridApi.getFilterModel();
    let inst = this.gridFiltersModalService.open(savedState, this.pageId);
    inst.result.then(
      (result) => {
        this.value = result.id;
        this.currentView = result;
        this.currentUserGrids.push(result);
      },
      () => {}
    );
  }

  saveDefault = async (row) => {
    let e = row.table_default == 1 ? 0 : 1;

    for (let i = 0; i < this.currentUserGrids.length; i++) {
      //reset
      this.currentUserGrids[i].table_default = 0;

      if (row.id == this.currentUserGrids[i].id)
        this.currentUserGrids[i].table_default = e;

      await this.tableFilterSettingsService.saveTableSettings(
        this.currentUserGrids[i].id,
        this.currentUserGrids[i]
      );
    }
  };

  isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  selectTable(row) {
    let e = this.isJsonString(row.data) ? JSON.parse(row.data) : row.data;
    try {
      this.gridApi.setFilterModel(e);
      this.value = row.id;
      //this.emitFilter.emit(this.value);
      this.currentView = row;
    } catch (err) {}
  }

  constructor(
    private tableFilterSettingsService: TableFilterSettingsService,
    private gridFiltersModalService: GridFiltersModalService,
    private gridFiltersEditModalService: GridFiltersEditModalService,
    private authenticationService: AuthenticationService,
    private router: Router
  ) {}

  private params!: CustomStatsToolPanelParams;

  otherGrids = [];
  currentUserGrids = [];
  myView = false;
  currentView: any;
  data = [];
  value;
  gridApi: GridApi;
  afterData = [];
  defaultFilters = [];
  current: any;

  ngOnInit() {}

  getOtherGridByUsers = async () => {
    this.currentUserGrids = [];
    this.otherGrids = [];

    this.data = [];
    this.afterData = [];
    this.defaultFilters = [];

    this.afterData = await this.tableFilterSettingsService.find({
      pageId: this.pageId,
      tf_active: "1",
      userId: this.authenticationService.currentUserValue.id,
    });
    this.current = "";
    for (let i = 0; i < this.afterData.length; i++) {
      let row = this.afterData[i];

      if (row.userId != this.authenticationService.currentUserValue.id) {
        this.otherGrids.push(row);
      } else {
        this.currentUserGrids.push(row);
      }

      if (this.value && this.value == row.id) {
        this.current = row;
      } else if (row.table_default && !this.value) {
        this.current = row;
      }
    }

    if (this.current) {
      this.value = this.current.id;
      this.currentView = this.current;

      if (this.gridApi) {
        this.gridApi!.setFilterModel(JSON.parse(this.current.data));
      }
    }
  };

  agInit(params: CustomStatsToolPanelParams): void {
    this.params = params;
    this.gridApi = params.api;

    this.gridApi.addEventListener("toolPanelVisibleChanged", (parms) => {
      if (parms?.visible) {
        this.openUp();
      }
    });

    if (!this.params.context?.pageId) {
      this.pageId = this.router.url?.split("?")[0];
    } else {
      this.pageId = this.params.context?.pageId;
    }

    this.getOtherGridByUsers();
  }

  pageId: any;

  refresh(): void {}
}
