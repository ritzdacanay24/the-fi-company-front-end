import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MaterialRequestFormModalComponent } from "./material-request-form-modal.component";

@Injectable({
    providedIn: 'root'
})
export class MaterialRequestFormModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(title: string, enableEdit: boolean = true, id?: number) {
        let modalRef = this.modalService.open(MaterialRequestFormModalComponent, {
            size: 'xl',
            fullscreen: false,
            scrollable: true
        });

        modalRef.componentInstance.title = title;
        modalRef.componentInstance.enableEdit = enableEdit;
        modalRef.componentInstance.id = id;

        return modalRef;
    }
}
