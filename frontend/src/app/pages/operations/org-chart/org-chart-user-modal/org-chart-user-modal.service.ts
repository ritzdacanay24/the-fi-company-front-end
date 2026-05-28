import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { OrgChartUserModalComponent } from "./org-chart-user-modal.component";

export type OrgChartUserModalMode = "view" | "edit";

@Injectable({
  providedIn: "root",
})
export class OrgChartUserModalService {
  constructor(private readonly modalService: NgbModal) {}

  open(options: { id: number | string; mode?: OrgChartUserModalMode; title?: string }) {
    const modalRef = this.modalService.open(OrgChartUserModalComponent, {
      size: "lg",
      backdrop: "static",
    });

    modalRef.componentInstance.id = options.id;
    modalRef.componentInstance.mode = options.mode ?? "view";
    modalRef.componentInstance.modalTitle = options.title ?? "User Profile";
    return modalRef;
  }
}