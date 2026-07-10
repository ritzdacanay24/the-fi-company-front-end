

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { FeatureType } from '@app/shared/enums/feature.enum';

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { PartsOrderFormComponent } from '../parts-order-form/parts-order-form-component';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';

@Injectable({
    providedIn: 'root'
})
export class PartsOrderModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(id) {
        let modalRef = this.modalService.open(PartsOrderModalComponent, { size: 'lg' });
        modalRef.componentInstance.id = id;
        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, NgbScrollSpyModule, PartsOrderFormComponent],
    selector: 'app-parts-order-modal',
    templateUrl: './parts-order-modal.component.html',
    styleUrls: []
})
export class PartsOrderModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private api: PartsOrderService,
        private fb: FormBuilder,
    ) {
    }


    ngOnInit(): void {
    }

    currentSection = 'item-1'

    isLoading = false;

    setFormElements = ($event) => {
        this.form = $event;
        if (this.id) this.getData();
    }

    @Input() id = null
    @Input() request_date = null
    @Input() start_time = null
    @Input() techs = null

    title = "Job Modal";

    icon = "mdi-calendar-text";

    form: FormGroup;

    dismiss() {
        this.ngbActiveModal.dismiss()
    }

    close() {
        this.ngbActiveModal.close()
    }

    submitted = false;
    readonly FeatureType = FeatureType;

    request_id = ''
    details: FormArray;

    async getData() {
        try {
            let data: any = await this.api.getBySoLineNumber(this.id)
            this.request_id = data?.id;

            if (data.details) {
                data.details = JSON.parse(data.details);

                this.details = this.form.get('details') as FormArray;

                for (let i = 0; i < data.details.length; i++) {
                    let row = data.details[i];

                    this.details.push(this.fb.group({
                        part_number: new FormControl(row.part_number, Validators.required),
                        qty: new FormControl(row.qty, Validators.required),
                        billable: new FormControl(row.billable, Validators.required),
                        description: new FormControl(row.description, Validators.required),
                    }))
                }
            };

            this.form.patchValue(data);
            this.form.disable();
            this.form.get('tracking_number').enable();
            this.form.get('tracking_number_carrier').enable();
            this.form.get('return_tracking_number').enable();
            this.form.get('return_tracking_number_carrier').enable();
        } catch (err) { }
    }

    async onSubmit() {
        try {
            await this.api.update(this.request_id, this.form.value)
            this.close()
        } catch (err) {
        }

    }

}
