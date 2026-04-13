import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
@Injectable({
    providedIn: 'root'
})
export class EventModalCreateService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(EventModalCreateComponent, { size: 'lg', fullscreen: false, scrollable: true });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventFormComponent } from "../event-form/event-form.component";
import { FormGroup } from "@angular/forms";
import { SchedulerEventService } from "@app/core/api/field-service/scheduler-event.service";
import { SharedModule } from "@app/shared/shared.module";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";

@Component({
    standalone: true,
    imports: [SharedModule, EventFormComponent],
    selector: 'app-event-modal-create',
    templateUrl: './event-modal-create.component.html',
    styleUrls: []
})
export class EventModalCreateComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private schedulerEventService: SchedulerEventService,
        private authenticationService: AuthenticationService
    ) {
    }


    ngOnInit(): void {
    }

    @Input() data = null

    title = "Create Event";

    icon = "mdi-calendar-text";

    form: FormGroup;

    dismiss() {
        this.ngbActiveModal.dismiss();
    }

    close() {
        this.ngbActiveModal.close();
    }

    setFormEmitter($event) {
        this.form = $event;

        this.form.patchValue({
            ...this.data,
            created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            created_by: this.authenticationService.currentUserValue.id
        })
    }

    async onSubmit() {
        this.create()
    }

    submitted = false

    async create() {
        this.submitted = true;
        if (this.form.invalid) {
            getFormValidationErrors()
            return
        }

        try {

            let data = this.form.value;

            if (data.techRelated == 1 && data['title'])
                data['title'] = data['title'].toString();
            if (data.techRelated == 1 && data['resource_id'])
                data['resource_id'] = data['resource_id'].toString();

            await this.schedulerEventService.create(this.form.value)
            this.close()
        } catch (err) {

        }
    }


}
