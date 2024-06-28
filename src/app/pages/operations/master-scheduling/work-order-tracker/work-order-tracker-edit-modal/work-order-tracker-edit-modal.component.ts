import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { KanbanApiService } from '@app/core/api/kanban';
import { WorkOrderTrackerFormComponent } from '@app/pages/operations/master-scheduling/work-order-tracker/work-order-tracker-form/work-order-tracker-form.component';

@Injectable({
    providedIn: 'root'
})
export class KanbanEditModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(id: string) {
        this.modalRef = this.modalService.open(WorkOrderTrackerEditModalComponent, { size: 'lg' });
        this.modalRef.componentInstance.id = id;
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, WorkOrderTrackerFormComponent],
    selector: 'app-work-order-tracker-edit-modal',
    templateUrl: `./work-order-tracker-edit-modal.component.html`,
    styleUrls: []
})

export class WorkOrderTrackerEditModalComponent {

    constructor(
        private ngbActiveModal: NgbActiveModal,
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
        //this.isLoading = true;
        try {
            this.form.value.start_time = this.form.value.start_time ? this.form.value.start_time : null;
            this.form.value.end_time = this.form.value.end_time ? this.form.value.end_time : null;
            await this.kanbanApiService.update(this.id, this.form.value)
            //this.isLoading = false;

            this.close(this.form.value)
        } catch (err) {
            //this.isLoading = false;

            this.data = { ...this.data }
        }
    }


}
