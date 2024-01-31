import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ReceiptAddEditComponent } from "./receipt-add-edit.component";

@Injectable({
  providedIn: 'root'
})
export class ReceiptAddEditService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(workOrderId, typeOfClick?, id?) {
    let modalRef = this.modalService.open(ReceiptAddEditComponent, { size: 'md', fullscreen: false });
    modalRef.componentInstance.workOrderId = workOrderId;
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.typeOfClick = typeOfClick;

    return modalRef;
  }
}
