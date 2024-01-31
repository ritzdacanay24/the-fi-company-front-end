import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { JobModalComponent } from "./job-modal.component";

@Injectable({
  providedIn: 'root'
})
export class JobModalService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(id, request_date?, start_time?, techs?) {
    let modalRef = this.modalService.open(JobModalComponent, { size: 'lg', fullscreen: false, backdrop: 'static', scrollable: true });
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.request_date = request_date;
    modalRef.componentInstance.start_time = start_time;
    modalRef.componentInstance.techs = techs;
    return modalRef;
  }
}
