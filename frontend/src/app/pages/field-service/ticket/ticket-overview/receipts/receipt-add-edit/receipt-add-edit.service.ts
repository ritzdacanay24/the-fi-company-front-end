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

  open(fsId, workOrderId, typeOfClick?, id?, draftName?) {
    let modalRef = this.modalService.open(ReceiptAddEditComponent, { size: 'md', fullscreen: false });
    modalRef.componentInstance.fsId = fsId;
    modalRef.componentInstance.workOrderId = workOrderId;
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.typeOfClick = typeOfClick;
    
    // If draft name is provided, enable batch mode and load the draft
    if (draftName) {
      modalRef.componentInstance.batchMode = true;
      modalRef.componentInstance.loadDraftOnInit = draftName;
    }

    return modalRef;
  }
}
