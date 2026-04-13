import { Injectable } from '@angular/core';
import { ZebraPrintModalComponent } from '@app/shared/components/zebra-print-modal/zebra-print-modal.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Injectable({
  providedIn: 'root'
})
export class ZebraPrintModalService {

  constructor(private modalService: NgbModal) {}

  open(serialNumber: string, selectedTemplateId?: string): NgbModalRef {
    const modalRef = this.modalService.open(ZebraPrintModalComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.serialNumber = serialNumber;
    if (selectedTemplateId) {
      modalRef.componentInstance.selectedTemplateId = selectedTemplateId;
    }

    return modalRef;
  }
}
