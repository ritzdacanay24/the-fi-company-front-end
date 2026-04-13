import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ICellRendererAngularComp } from "ag-grid-angular";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-icon-renderer",
  templateUrl: "./icon-renderer.component.html",
})
export class IconRendererComponent implements ICellRendererAngularComp {
  params: any;
  iconName: string;
  showValue: boolean;
  value: string;
  label: any;
  classColor: string = "#000";
  data: any;

  agInit(params): void {
    this.params = params;
    this.data = params.data;
    this.label = params.label;
    this.classColor = params.classColor;
    this.showValue = params.showValue;

    this.iconName = params.iconName;
  }

  refresh(params?: any): boolean {
    this.params.value = params.value;
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
