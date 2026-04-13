import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { JobModalEditComponent } from "./job-modal-edit.component";

@Injectable({
  providedIn: "root",
})
export class JobModalService {
  constructor(public modalService: NgbModal) {}

  open(id, request_date?, start_time?, techs?) {
    let modalRef = this.modalService.open(JobModalEditComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.request_date = request_date;
    modalRef.componentInstance.start_time = start_time;
    modalRef.componentInstance.techs = techs;
    return modalRef;
  }
}
