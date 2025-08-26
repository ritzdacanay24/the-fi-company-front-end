import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ZebraLabelPrintModalComponent } from './zebra-label-print-modal.component';

@Injectable({
  providedIn: 'root'
})
export class ZebraLabelPrintModalService {
  constructor(private modalService: NgbModal) {}

  open(data: {
    serialNumber: string;
    title?: string;
    partNumber?: string;
  }) {
    const modalRef = this.modalService.open(ZebraLabelPrintModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.serialNumber = data.serialNumber;
    modalRef.componentInstance.title = data.title || 'Print Zebra Label';
    modalRef.componentInstance.partNumber = data.partNumber || '';

    return modalRef;
  }
}
