import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { WorkInfoComponent } from "./work-info.component";

@Injectable({
  providedIn: 'root'
})
export class WorkInfoService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(workOrderId, id?, startDate?) {
    let modalRef = this.modalService.open(WorkInfoComponent, { size: 'lg', fullscreen: false, centered: true, scrollable: true, backdrop: 'static' });
    modalRef.componentInstance.workOrderId = workOrderId;
    modalRef.componentInstance.id = id || null;
    modalRef.componentInstance.startDate = startDate;
    return modalRef;
  }
}
