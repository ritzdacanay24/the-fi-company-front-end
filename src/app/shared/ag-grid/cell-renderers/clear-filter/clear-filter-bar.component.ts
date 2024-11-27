import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
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
}
