import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { clearAgGridStateFromStorage, hasAgGridStateInStorage } from "@app/shared/utils/ag-grid-state-storage.util";
import { IStatusPanelAngularComp } from "ag-grid-angular";
import { IStatusPanelParams } from "ag-grid-community";

@Component({
  imports: [SharedModule],
  standalone: true,
  templateUrl: `./clear-filter-bar.component.html`,
})
export class ClearFilterStatusBarComponent implements IStatusPanelAngularComp {
  public params!: IStatusPanelParams;

  agInit(params: IStatusPanelParams): void {
    this.params = params;
  }

  onClick(): void {
    alert("Selected Row Count: " + this.params.api.getSelectedRows().length);
  }

  clearFilters() {
    this.params.api.setFilterModel(null);
    this.params.api.onFilterChanged();
  }

  hasSavedGridState(): boolean {
    const storageKey = String(this.params?.context?.gridStateStorageKey || "").trim();
    if (!storageKey) {
      return false;
    }

    return hasAgGridStateInStorage(storageKey);
  }

  clearSavedGridState(): void {
    const storageKey = String(this.params?.context?.gridStateStorageKey || "").trim();
    if (!storageKey) {
      return;
    }

    clearAgGridStateFromStorage(storageKey);

    // Reset current grid view so users immediately see the default state.
    if (typeof this.params.api?.resetColumnState === "function") {
      this.params.api.resetColumnState();
    }

    this.params.api?.setFilterModel?.(null);
    this.params.api?.onFilterChanged?.();

    if (typeof this.params.api?.setGridOption === "function") {
      this.params.api.setGridOption("quickFilterText", "");
    }
  }
}
