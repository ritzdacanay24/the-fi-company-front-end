
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-kanban-renderer',
  templateUrl: './kanban-renderer.component.html'
})

export class KanbanRendererComponent implements ICellRendererAngularComp {

  params: any;

  isLink = false;

  agInit(params): void {

    if(!params.data) return

    this.params = params;

    this.isLink = params?.isLink;
  }

  refresh(params?: any): boolean {

    this.params.value = params?.value;
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
