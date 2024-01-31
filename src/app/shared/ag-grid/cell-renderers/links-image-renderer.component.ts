
import { Component } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-links-image-renderer',
  template: `
  <span *ngFor="let row of params.data?.links">
    <a  *ngIf="isPdf(row) && row" (click)="viewReceipt(row)"><img src='{{row}}' style="width:25px;height:25px" class="rounded"></a>
    <a  *ngIf="!isPdf(row) && row" (click)="viewReceipt(row)"><i class="mdi mdi-file-pdf-box text-danger" style="font-size:30px;margin-left: -2px;"></i></a>
  </span>

  `
})

export class LinksImageRendererComponent implements ICellRendererAngularComp {



  isPdf(fileName) {
    return (fileName?.substring(fileName?.lastIndexOf('.') + 1) !== 'pdf')
  }

  params: any;
  agInit(params): void {

    if (!params.data) return

    this.params = params;
  }

  refresh(params?: any): boolean {

    this.params.value = params?.value;
    return true;
  }


  viewReceipt(row) {
    window.open(row, 'Image', 'width=largeImage.stylewidth,height=largeImage.style.height,resizable=1');

  }


  onClick($event: any, row) {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        row: row,
        event: $event,
        rowData: this.params.node.data
      }
      this.params.onClick(params);
    }
  }
}
