import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'app-checkbox-renderer',
  templateUrl: './checkbox-renderer.component.html'
})

export class CheckboxRendererComponent implements ICellRendererAngularComp {

  params: any;
  agInit(params): void {
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

  checkedHandler(event) {
    let checked = event.target.checked;
    let colId = this.params.column.colId;
    this.params.node.setDataValue(colId, checked);

    const params = {
      event: event,
      rowData: this.params.node.data
    }
    this.params.onClick(params);
  }
}