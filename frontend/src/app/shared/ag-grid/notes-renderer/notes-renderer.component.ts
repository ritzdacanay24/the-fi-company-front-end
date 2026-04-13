import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";

import tippy from "tippy.js";
import { isEmpty } from "src/assets/js/util";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-notes-renderer",
  templateUrl: "./notes-renderer.component.html",
})
export class NotesRendererComponent implements ICellRendererAngularComp {
  params: any;
  notes: any;
  iconColor = "";
  data;
  agInit(params): void {
    this.params = params;
    this.data = params.data;

    this.notes = params.data?.recent_notes;

    if (!isEmpty(this.notes)) {
      this.iconColor = "text-warning";

      if (moment().isSame(this.notes?.createdDate, "day")) {
        this.iconColor = "text-success";
      }

      this.instance = tippy(params.eGridCell, {
        content: `
        <div class="card shadow-lg bg-light">
        <div class="card-header d-flex align-items-center">
        <h4 class="card-title mb-0">${this.notes?.uniqueId}</h4>
        </div>
            <div class="card-body bg-light" style="overflow:hidden">
              <h6 class="mb-2">Recent note</h6>
              ${this.notes?.notes}
            </div>
            <div class="card-footer bg-light">
              <p><b>Comment date: </b> ${this.notes?.createdDate}</p>
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

  instance

  refresh(params?: any): boolean {
    this.params = params.data;

    return true;
  }

  onClick($event: any) {
    $event.preventDefault();
    this.instance?.hide();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.data,
      };
      this.params.onClick(params);
    }
  }
}
