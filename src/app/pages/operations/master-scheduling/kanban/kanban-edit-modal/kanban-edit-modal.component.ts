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

@Injectable({
    providedIn: 'root'
})
export class KanbanEditModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(id: string) {
        this.modalRef = this.modalService.open(KanbanEditModalComponent, { size: 'lg'});
        this.modalRef.componentInstance.id = id;
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, KanbanFormComponent],
    selector: 'app-kanban-edit-modal',
    templateUrl: `./kanban-edit-modal.component.html`,
    styleUrls: []
})

export class KanbanEditModalComponent {

    constructor(
        private addressInfoService: AddressInfoService,
        private ngbActiveModal: NgbActiveModal,
        private kanbanConfigApiService: KanbanConfigApiService,
        private kanbanApiService: KanbanApiService
    ) { }

    @Input() public id: any;
    @Input() public data: any;

    isLoading = true;
    queues
    currentSelection

    async getData() {
        this.isLoading = true;
        try {
            this.data = await this.kanbanApiService.getById(this.id)
            this.form.patchValue(this.data)
            this.form.get('wo_nbr').disable()
            this.form.get('kanban_ID').disable()
            this.isLoading = false;
        } catch (err) {
        }
    }


    form: any;

    submitted = false;

    setFormEmitter($event) {
        this.form = $event;
    }

    ngOnInit() {
        this.getData();
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close(data?) {
        this.ngbActiveModal.close(data);
    }

    async onSubmit() {
        this.isLoading = true;
        try {
            await this.kanbanApiService.update(this.id, this.form.value)
            this.isLoading = false;

            this.close(this.form.value)
        } catch (err) {
            this.isLoading = false;

            this.data = { ...this.data }
        }
    }


}
