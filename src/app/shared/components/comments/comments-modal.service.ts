import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { CommentsModalComponent } from "./comments-modal.component";

@Injectable({
  providedIn: "root",
})
export class CommentsModalService {
  constructor(public modalService: NgbModal) {}

  open(
    orderNum?: undefined,
    type?: any,
    title?: undefined,
    userId?: undefined,
    userName?: undefined
  ) {
    let modalRef = this.modalService.open(CommentsModalComponent, {
      size: "lg",
      fullscreen: false,
      scrollable: true,
      centered: true,
    });
    modalRef.componentInstance.orderNum = orderNum;
    modalRef.componentInstance.type = type;
    modalRef.componentInstance.title = title || "Comments";
    modalRef.componentInstance.userId = userId;
    modalRef.componentInstance.userName = userName;
    return modalRef;
  }
}
