import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { CommentsModalComponent } from "./comments-modal.component";

@Injectable({
  providedIn: "root",
})
export class CommentsModalService {
  constructor(public modalService: NgbModal) { }

  open(
    orderNum?: string,
    type?: any,
    title?: string,
    userId?: number,
    userName?: string
  ) {
    let modalRef = this.modalService.open(CommentsModalComponent, {
      backdrop:false,
      size: "lg",
      fullscreen: false,
      scrollable: true,
      centered: true,
      backdropClass: 'backgroundTransparent',
      modalDialogClass: 'backgroundTransparent1',
      windowClass: 'backgroundTransparent'

    });
    modalRef.componentInstance.orderNum = orderNum;
    modalRef.componentInstance.type = type;
    modalRef.componentInstance.title = title || "Comments";
    modalRef.componentInstance.userId = userId;
    modalRef.componentInstance.userName = userName;
    return modalRef;
  }
}
