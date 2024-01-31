import { Component } from '@angular/core';
import { isEmpty } from 'src/assets/js/util';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import tippy from 'tippy.js';

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

@Component({
  selector: 'app-pick-sheet-renderer',
  templateUrl: './pick-sheet-renderer.component.html',
  styleUrls: ['./pick-sheet-renderer.component.scss']
})

export class PickSheetRendererComponent implements ICellRendererAngularComp {

  value: string;
  printDetails: any;
  iconColor: string = '';
  iconBgColor: string = 'bg-light';
  icon: string = 'mdi-clipboard-outline'
  params: any;

  agInit(params): void {

    if (!params.data) return

    this.params = params;

    let content = "";
    if (!isEmpty(params.data.print_details)) {
      this.printDetails = params.data.print_details;
      this.iconColor = 'text-info';
      this.iconBgColor = 'bg-info';
      if (this.params.data.LINESTATUS == 0) {
        this.iconColor = 'text-success';
        this.iconBgColor = 'bg-success';
        this.icon = 'mdi-clipboard-check'
      } else if (this.params.data.LINESTATUS < 0) {
        this.iconColor = 'text-danger';
        this.iconBgColor = 'bg-danger';
        this.icon = 'mdi-clipboard-alert'
      }

      content = `
        <div class="card tooltip-card tooltip-card-no-shadow p-2">
          <div class="card-header p-2 rounded ${this.iconBgColor} text-white">
            <h5>${this.params.value}</h5>
          </div>
          <div class="card-body p-2" style="overflow:hidden">
            <h6 class="mb-2">Print Details</h6>
            <p><b>Assigned to:</b> ${this.printDetails?.assignedTo} </p>
            <p><b>Printed date:</b> ${this.printDetails?.printedDate} </p>
            <p><b>Comments:</b> ${this.printDetails?.comments} </p>
            ${this.params.data.LINESTATUS ? `<p><b>Qty to pick: </b> ${this.params.data.LINESTATUS}</p>` : 'Pick Complete'}
            <p class="mt-2">Click on the <i class="mdi ${this.icon} ${this.iconColor} icon-mm"></i> icon to view/print pick sheet.</p>
          </div>
          <div class="card-footer p-2">
            <p><b>Printed by: </b> ${this.printDetails?.createdByName}</p>
          </div>
        </div>
      `

    } else {
      content = `
          <div class="card tooltip-card tooltip-card-no-shadow">
            <div class="card-header p-2"><h5>${this.params.value}</h5></div>
            <div class="card-body p-2" style="overflow:hidden">
              <h6 class="mb-2">Print Details</h6>
              ${this.params.data.LINESTATUS ? `<p><b>Qty to pick: </b> ${this.params.data.LINESTATUS}</p>` : 'Pick Complete'}
              <p>This is not printed yet.</p>
              <p>Click on the <i class="mdi ${this.icon} icon-mm"></i> icon to view/print pick sheet.</p>
            </div>
          </div>
        `
    }

    tippy(params.eGridCell, {
      // animateFill: false,
      arrow: false,
      content: content,
      placement: 'top-start',
      allowHTML: true,
      offset: [20, -3],
      trigger: 'mouseenter'
    })

  }

  refresh(params?: any): boolean {
    this.params = params;
    return true;
  }

  onClick($event: any) {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.node.data
      }
      this.params.onClick(params);
    }
  }
}