import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PrintTicketComponent } from './print-ticket.component';

@Injectable({
  providedIn: 'root'
})
export class PrintTicketService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(ticketId: string, printDetails: boolean = false) {
    this.modalRef = this.modalService.open(PrintTicketComponent, { size: 'lg' });
    this.modalRef.componentInstance.ticketId = ticketId;
    this.modalRef.componentInstance.printDetails = printDetails;
    this.getInstance();
  }

  getInstance() {
    return this.modalRef;
  }

}
