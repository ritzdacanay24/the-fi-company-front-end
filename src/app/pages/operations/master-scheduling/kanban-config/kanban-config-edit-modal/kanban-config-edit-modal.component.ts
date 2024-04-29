import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { KanbanApiService } from '@app/core/api/kanban';
import { KanbanConfigFormComponent } from '../kanban-config-form/kanban-config-form.component';

@Injectable({
    providedIn: 'root'
})
export class KanbanConfigEditModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(id: string) {
        this.modalRef = this.modalService.open(KanbanConfigEditModalComponent, { size: 'lg' });
        this.modalRef.componentInstance.id = id;
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, KanbanConfigFormComponent],
    selector: 'app-kanban-config-edit-modal',
    templateUrl: `./kanban-config-edit-modal.component.html`,
    styleUrls: []
})

export class KanbanConfigEditModalComponent {

    constructor(
        private ngbActiveModal: NgbActiveModal,
        private kanbanConfigApiService: KanbanConfigApiService,
        private kanbanApiService: KanbanApiService,
    ) { }

    @Input() public id: any;
    @Input() public data: any;

    isLoading = true;

    async getData() {
        this.isLoading = true;
        try {
            this.data = await this.kanbanConfigApiService.getById(this.id)
            this.data.user_roles = this.data.user_roles?.split(',');
            this.form.patchValue(this.data)
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    form: any;

    submitted = false;

    setFormEmitter($event) {
        this.form = $event;
    }

    ngOnInit() {
        if (this.id) {
            this.getData();
        }
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close(data?) {
        this.ngbActiveModal.close(data);
    }

    async onSubmit() {
        this.isLoading = true;
        this.form.value.user_roles = this.form.value?.user_roles?.toString() || null;
        try {
            await this.kanbanConfigApiService.update(this.id, this.form.value)
            this.isLoading = false;
            this.close(this.data)
        } catch (err) {
            this.isLoading = false;
            this.data = { ...this.data }
        }
    }


}
