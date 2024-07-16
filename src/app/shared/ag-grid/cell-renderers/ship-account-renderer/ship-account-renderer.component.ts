import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ICellRendererAngularComp } from "ag-grid-angular";
import tippy from "tippy.js";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-ship-account-renderer",
  templateUrl: "./ship-account-renderer.component.html",
  styleUrls: [],
})
export class ShipAccountRendererComponent implements ICellRendererAngularComp {
  params: any;
  iconName: string;
  showValue: boolean;
  value: string;
  label: any;
  iconColor: string;
  iconBgColor: string;
  miscData: any;
  data: any;

  agInit(params): void {
    if (!params.data) return;
    this.params = params;
    this.value = params.value;
    this.label = params.label;
    this.miscData = params?.data?.misc;
    this.data = params?.data;

    if (this.miscData.lastModDate) {
      this.iconColor = "text-info";
      this.iconBgColor = "bg-info text-white";
      tippy(params.eGridCell, {
        content: `
        <div class="card tooltip-card tooltip-card-no-shadow p-2" style="min-width:200px">
          <div class="card-header p-1 rounded"><h5>${this.miscData.so}</h5></div>
          <div class="card-body p-2" style="overflow:hidden">
            <h6 class="mb-2">Misc Info</h6>
            <p>Last Modified: ${this.miscData.lastModDate}</p>
          </div>
          <div class="card-footer p-2">
            <h6>Due date: ${this.data.SOD_DUE_DATE}</h6>
          </div>
        </div>
      `,
        placement: "top-start",
        allowHTML: true,
        theme: "light",
        offset: [20, -3],
        trigger: "mouseenter",
      });
    }
  }

  refresh(params?: any): boolean {
    this.params = params;
    this.data = this.data;
    return true;
  }

  onClick($event: any) {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.node.data,
      };
      this.params.onClick(params);
    }
  }
}
