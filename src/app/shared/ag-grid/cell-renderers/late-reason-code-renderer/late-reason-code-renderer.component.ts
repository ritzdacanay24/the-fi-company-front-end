import { Component } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-late-reason-code-renderer',
  templateUrl: './late-reason-code-renderer.component.html',
  styleUrls: ['./late-reason-code-renderer.component.scss']
})

export class LateReasonCodeRendererComponent implements ICellRendererAngularComp {

  params: any;
  data: any;

  agInit(params): void {

    if (!params.data) return

    this.params = params;
  }

  refresh(params?: any): boolean {
    this.params.value = params.value;
    this.data = params.data;
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