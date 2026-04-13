import { Component } from "@angular/core";
import { TableSettingsService } from "@app/core/api/table-settings/table-settings.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { IToolPanelAngularComp } from "ag-grid-angular";
import { GridApi, IRowNode, IToolPanelParams } from "ag-grid-community";
import { NgSelectModule } from "@ng-select/ng-select";
import { autoSizeColumnsApi } from "src/assets/js/util";
import { GridSettingsEditModalService } from "@app/shared/grid-settings/grid-settings-edit-modal/grid-settings-edit-modal.component";
import { GridSettingsModalService } from "@app/shared/grid-settings/grid-settings-modal/grid-settings-modal.component";
import { FullTextSearchPipe } from "@app/shared/pipes/full-text-search.pipe";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";

export interface CustomStatsToolPanelParams extends IToolPanelParams {
  title: string;
}

@Component({
  standalone: true,
  imports: [SharedModule, NgSelectModule, FullTextSearchPipe],
  templateUrl: `./grid-settings-tool-panel.component.html`,
  styleUrl: `./grid-settings-tool-panel.component.scss`,
})
export class GridSettingsToolPanel implements IToolPanelAngularComp {
  query = "";

  async update() {
    const savedState = this.gridApi.getColumnState();
    const allState = this.gridApi.getState();
    let saveData = {
      data: JSON.stringify(savedState),
      allState: JSON.stringify(allState),
    };

    this.currentUserGrids = this.currentUserGrids.map((pilot) => {
      if (this.value == pilot.id) pilot.data = JSON.stringify(savedState);
      return pilot;
    });

    await this.tableSettingsService.saveTableSettings(this.value, saveData);
  }

  viewAll() {
    let inst = this.gridSettingsEditModalService.open(this.pageId);
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
    this.myView = false;
    this.gridApi?.showLoadingOverlay();
    this.value = "";
    this.currentView = null;

    setTimeout(() => {
      this.gridApi.resetColumnState();
      autoSizeColumnsApi(this.gridApi);
      this.gridApi?.hideOverlay();
    }, 500);
  }

  createNewView() {
    const savedState = this.gridApi.getColumnState();
    let inst = this.gridSettingsModalService.open(savedState, this.pageId);
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

      await this.tableSettingsService.saveTableSettings(
        this.currentUserGrids[i].id,
        this.currentUserGrids[i]
      );
    }
  };

  selectTable(row) {
    this.myView = true;
    this.gridApi?.showLoadingOverlay();
    setTimeout(() => {
      this.gridApi!.applyColumnState({
        state: JSON.parse(row.data),
        applyOrder: true,
      });
      this.gridApi?.hideOverlay();
    }, 500);
    this.value = row.id;
    this.currentView = row;
  }

  constructor(
    private tableSettingsService: TableSettingsService,
    private gridSettingsModalService: GridSettingsModalService,
    private gridSettingsEditModalService: GridSettingsEditModalService,
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

  ngOnInit() {}

  getOtherGridByUsers = async () => {
    this.myView = false;
    let data = await this.tableSettingsService.getTableByUserId({
      pageId: this.pageId,
      userId: this.authenticationService.currentUserValue.id,
    });

    let current: any;
    for (let i = 0; i < data.data.length; i++) {
      let row = data.data[i];
      if (row.userId != this.authenticationService.currentUserValue.id) {
        this.otherGrids.push(row);
      } else {
        this.currentUserGrids.push(row);
      }

      if (this.value && this.value == row.id) {
        current = row;
      } else if (row.table_default && !this.value) {
        this.myView = true;
        current = row;
      }
    }

    if (current) {
      this.value = current.id;
      this.currentView = current;

      let d = JSON.parse(current?.allState);

      if (d?.pivot?.pivotMode) {
        this.gridApi!.setGridOption("pivotMode", d.pivot?.pivotMode);
      }

      if (this.gridApi) {
        this.gridApi!.applyColumnState({
          state: JSON.parse(current.data),
          applyOrder: true,
        });
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
    
    const elements = document.querySelectorAll(".ag-icon.ag-icon-pivot"); 

    //this.getOtherGridByUsers();
  }

  pageId: any;

  refresh(): void {}
}
