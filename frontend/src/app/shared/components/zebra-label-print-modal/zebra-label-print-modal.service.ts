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
    date?: string;
    volts?: string;
    hz?: string;
    amps?: string;
    templateId?: string;
  }) {
    const modalRef = this.modalService.open(ZebraLabelPrintModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.serialNumber = data.serialNumber;
    modalRef.componentInstance.title = data.title || 'Print Zebra Label';
    modalRef.componentInstance.partNumber = data.partNumber || '';
    modalRef.componentInstance.date = data.date || '';
    modalRef.componentInstance.volts = data.volts || '';
    modalRef.componentInstance.hz = data.hz || '';
    modalRef.componentInstance.amps = data.amps || '';
    modalRef.componentInstance.templateId = data.templateId || 'serial-number-standard';

    return modalRef;
  }
}
