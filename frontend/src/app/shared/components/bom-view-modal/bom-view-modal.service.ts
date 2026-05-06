import { Injectable } from "@angular/core";
import { NgbModal, NgbModalOptions, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { BomViewModalComponent } from "./bom-view-modal.component";

@Injectable({
  providedIn: "root",
})
export class BomViewModalService {
  private modalRef: NgbModalRef | null = null;

  constructor(private modalService: NgbModal) {}

  open(partNumber: string, soNumber?: string): NgbModalRef {
    const options: NgbModalOptions = {
      size: "xl",
      centered: true,
      scrollable: true,
      fullscreen: true,
      windowClass: "modal-fullwidth",
      backdrop: "static",
    };

    this.modalRef = this.modalService.open(BomViewModalComponent, options);
    this.modalRef.componentInstance.partNumber = partNumber;
    this.modalRef.componentInstance.soNumber = soNumber;

    return this.modalRef;
  }
}