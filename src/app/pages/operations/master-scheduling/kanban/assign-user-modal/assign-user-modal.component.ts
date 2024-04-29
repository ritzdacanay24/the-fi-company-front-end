import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddressInfoService } from '@app/core/api/address-info/address-info.service';
import { SharedModule } from '@app/shared/shared.module';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { KanbanApiService } from '@app/core/api/kanban';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { KanbanFormComponent } from '../kanban-form/kanban-form.component';
import moment from 'moment';
import { QadService } from '@app/core/api/qad/sales-order-search.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Injectable({
    providedIn: 'root'
})
export class AssignUserModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(id: string, wo_nbr?) {
        this.modalRef = this.modalService.open(AssignUserModalComponent, { size: 'lg' });
        this.modalRef.componentInstance.id = id;
        this.modalRef.componentInstance.wo_nbr = wo_nbr;
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, KanbanFormComponent],
    selector: 'app-assign-user-modal',
    templateUrl: `./assign-user-modal.component.html`,
    styleUrls: []
})

export class AssignUserModalComponent {

    constructor(
        private addressInfoService: AddressInfoService,
        private ngbActiveModal: NgbActiveModal,
        private kanbanConfigApiService: KanbanConfigApiService,
        private kanbanApiService: KanbanApiService,
        private qadService: QadService
    ) { }

    @Input() public id: any;
    @Input() public data: any;
    @Input() public wo_nbr: any;

    isLoading = true;
    queues
    currentSelection

    async getData() {
        this.isLoading = true;
        try {
            this.data = await this.kanbanApiService.getById(this.id)
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }


    form: any;

    submitted = false;

    setFormEmitter($event) {
        this.form = $event;
        this.form.patchValue({
            createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
        }, { emitEvent: false })

    }

    ngOnInit() {

        if (this.wo_nbr) {
            this.getWo()
        } else {
            this.getData();
        }
    }

    async getWo() {
        try {
            this.isLoading = true;

            let data: any = await this.qadService.asyncSearchWoNumber(this.wo_nbr)
            data = data[0]
            this.form.patchValue({
                wo_nbr: data.wo_nbr,
                due_date: data.wo_due_date,
                prod_line: data.wo_line,
                qty: data.wo_qty_ord,
                item_number: data.wo_part,
                item_description: data.description
            })
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close(data?) {
        this.ngbActiveModal.close(data);
    }

    async onSubmit() {
        try {
            SweetAlert.loading('Saving. Please wait...')
            await this.kanbanApiService.create(this.form.value)
            SweetAlert.close()
            this.close(this.data)
        } catch (err) {
            this.data = { ...this.data }
            SweetAlert.close()
        }
    }


}
