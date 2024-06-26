import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { QadPartSearchComponent } from '../qad-part-search/qad-part-search.component';
import { PartLookupComponent } from '../part-lookup/part-lookup.component';

@Injectable({
    providedIn: 'root'
})
export class ItemInfoModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    public open(partNumber: string) {
        this.modalRef = this.modalService.open(ItemInfoModalComponent, { size: 'xl', fullscreen: false, backdrop: 'static', scrollable: true, centered: true });
        this.modalRef.componentInstance.partNumber = partNumber;
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule, QadPartSearchComponent, PartLookupComponent],
    selector: 'app-item-info-modal',
    templateUrl: `./item-info-modal.component.html`,
    styleUrls: []
})

export class ItemInfoModalComponent {

    constructor(
        private ngbActiveModal: NgbActiveModal,
    ) {
    }

    ngOnInit() {
    }

    notifyParent($event) {
        this.partNumber = $event.pt_part
    }

    public dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    public close() {
        this.ngbActiveModal.close(this.partNumber);
    }

    isLoadingEmitter($event) {
    }

    hasDataEmitter = false;
    isLoading = false;
    @Input() partNumber = null;

    getData

    getDataEmitter($event) {
        this.getData = $event;
    }

}


