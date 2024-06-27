

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { NgbActiveModal, NgbCarouselModule, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { AttachmentsService, AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { PartsOrderFormComponent } from '../parts-order-form/parts-order-form-component';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { Lightbox } from 'ngx-lightbox';

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
    imports: [SharedModule, PartsOrderModalComponent, NgbScrollSpyModule, PartsOrderFormComponent, NgbCarouselModule],
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
        private attachmentsService: AttachmentsService,
        private lightbox: Lightbox,
        private fb: FormBuilder,
    ) {
    }


    ngOnInit(): void {
    }

    currentSection = 'item-1'

    viewAttachment(url) {
        window.open(url, '_blank');
    }


    images
    attachments: any = []
    async getAttachments() {
        this.images = []
        this.attachments = await this.attachmentsService.find({ field: 'FS Parts Order', uniqueId: this.request_id })

        for (let i = 0; i < this.attachments.length; i++) {
            let row = this.attachments[i]
            const src = 'https://dashboard.eye-fi.com/attachments/fieldService/' + row?.fileName;
            const caption = 'Image ' + i + '- ' + row?.createdDate;
            const thumb = 'https://dashboard.eye-fi.com/attachments/fieldService/' + row?.fileName;
            const item = {
                src: src,
                caption: caption,
                thumb: thumb
            };
            this.images.push(item);
        }

    }

    async deleteAttachment(id, index) {
        if (!confirm('Are you sure you want to remove attachment?')) return
        await this.attachmentsService.delete(id);
        this.attachments.splice(index, 1)
    }

    file: File = null;

    myFiles: string[] = [];

    onFilechange(event: any) {
        this.myFiles = [];
        for (var i = 0; i < event.target.files.length; i++) {
            this.myFiles.push(event.target.files[i]);
        }
    }

    isLoading = false;

    async onUploadAttachments() {
        if (this.myFiles) {
            let totalAttachments = 0;
            this.isLoading = true;
            const formData = new FormData();
            for (var i = 0; i < this.myFiles.length; i++) {
                formData.append("file", this.myFiles[i]);
                formData.append("field", "FS Parts Order");
                formData.append("uniqueData", `${this.id}`);
                formData.append("folderName", 'fieldService');
                try {
                    await this.attachmentsService.uploadfile(formData);
                    totalAttachments++
                } catch (err) {
                }
            }
            this.isLoading = false;
            await this.getAttachments()
        }
    }

    open(index: number): void {
        // open lightbox
        this.lightbox.open(this.images, index, {});
    }

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


            await this.getAttachments()
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
