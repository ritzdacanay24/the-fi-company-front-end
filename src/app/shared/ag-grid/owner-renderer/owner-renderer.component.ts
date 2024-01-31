import { Component } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { isEmpty } from 'src/assets/js/util';

import tippy from 'tippy.js';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-owner-renderer',
  templateUrl: './owner-renderer.component.html'
})

export class OwnerRendererComponent implements ICellRendererAngularComp {

  params: any;
  iconColor = '';
  data: any;

  agInit(params): void {
    if (!params.data) return
    this.params = params;
    this.data = this.params.data.misc;

    if (!isEmpty(this.data) && this.data.userName != '') {
      if (isEmpty(this.params.data.recent_owner_changes)) {
        this.iconColor = 'text-info';
      } else if (!isEmpty(this.params.data.recent_owner_changes)) {
        this.iconColor = 'text-success';
      }

      tippy(params.eGridCell, {
        content: `
        <div class="card shadow-md" style="min-width:300px">
        <div class="card-header d-flex align-items-center"><h4 class="card-title mb-0">${this.data.so}</h4></div>
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Owner Info</h6>
              Current owner is ${this.data.userName}
            </div>
          </div>
        `,
        placement: 'top-start',
        allowHTML: true,
        theme: 'light',
        offset: [20, -3],
        trigger: 'mouseenter'
      })
    } else if (!isEmpty(this.data) && !isEmpty(this.params.data.recent_owner_changes)) {
      this.iconColor = 'text-success';

      tippy(params.eGridCell, {
        content: `
        <div class="card shadow-md" style="min-width:300px">
        <div class="card-header d-flex align-items-center"><h4 class="card-title mb-0">${this.data.so}</h4></div>
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Owner Info</h6>
              Owner was changed today. Click on icon to view change.
            </div>
          </div>
        `,
        placement: 'top-start',
        allowHTML: true,
        theme: 'light',
        offset: [20, -3],
        trigger: 'mouseenter'
      })
    }
  }

  refresh(params?: any): boolean {
    this.params = params.data;

    return true;
  }

  onClick($event: any) {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.data
      }
      this.params.onClick(params);
    }
  }
}