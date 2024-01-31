import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'app-late-reason-code-renderer',
  templateUrl: './late-reason-code-renderer.component.html',
  styleUrls: ['./late-reason-code-renderer.component.scss']
})

export class LateReasonCodeRendererComponent implements ICellRendererAngularComp {

  params: any;
  agInit(params): void {

    if (!params.data) return

    this.params = params;
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
        rowData: this.params.node.data
      }
      this.params.onClick(params);
    }
  }
}