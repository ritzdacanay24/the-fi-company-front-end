import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SalesOrderInfoService } from '@app/core/api/sales-order/sales-order-info.service';
import { AgGridModule } from 'ag-grid-angular';
import { SharedModule } from '@app/shared/shared.module';
import { LoadingComponent } from '@app/shared/loading/loading.component';
import { SoSearchComponent } from '../so-search/so-search.component';
import { OrderLookupComponent } from '../order-lookup/order-lookup.component';

@Injectable({
  providedIn: 'root'
})
export class SalesOrderInfoModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(salesOrderLineNumber: string) {
    this.modalRef = this.modalService.open(SalesOrderInfoModalComponent, { size: 'lg', windowClass: 'modal-xxl' });
    this.modalRef.componentInstance.salesOrderNumber = salesOrderLineNumber;
    this.getInstance();
  }

  getInstance() {
    return this.modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, LoadingComponent, SoSearchComponent, OrderLookupComponent],
  selector: 'app-sales-order-info-modal',
  templateUrl: `./sales-order-info-modal.component.html`,
  styleUrls: [],
})

export class SalesOrderInfoModalComponent {
  transactions: any = [];
  loadingIndicatorTransactions: boolean;

  constructor(
    private salesOrderInfoService: SalesOrderInfoService,
    private ngbActiveModal: NgbActiveModal
  ) { }

  @Input() public salesOrderNumber: string = '';
  @Output() passEntry: EventEmitter<any> = new EventEmitter();


  async notifyParent($event) {
    this.salesOrderNumber = $event.sod_nbr;
  }


  ngOnInit() {
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close();
  }

  getData
  
  setData($event) {
    this.getData = $event;
  }
}
