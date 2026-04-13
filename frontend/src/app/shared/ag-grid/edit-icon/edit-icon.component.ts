import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ICellRendererAngularComp } from "ag-grid-angular";
import tippy from "tippy.js";

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-edit-icon",
  templateUrl: "./edit-icon.component.html",
})
export class EditIconComponent implements ICellRendererAngularComp {
  params: any;
  iconName: string;
  value: string;
  instances: any;
  placeholder: any;
  data: any;

  agInit(params): void {
    this.params = params;
    this.iconName = params.iconName;
    this.value = params.value;
    this.placeholder = params.placeholder;
    this.data = params.data;
  }

  refresh(params?: any): boolean {
    this.value = params.value;
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
