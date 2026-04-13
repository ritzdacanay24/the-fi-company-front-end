

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from "@angular/forms";
import { JobService } from "@app/core/api/field-service/job.service";
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { TokenStorageService } from '@app/core/services/token-storage.service';
import { TeamService } from '@app/core/api/field-service/fs-team.service';
import { AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';
import { AttachmentService } from '@app/core/api/field-service/attachment.service';
import { TicketOverviewComponent } from '../ticket-overview/ticket-overview.component';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AttachmentComponent } from '../ticket-overview/attachment/attachment.component';

@Injectable({
    providedIn: 'root'
})
export class TicketModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(id) {
        let modalRef = this.modalService.open(TicketModalComponent, { size: 'lg', fullscreen: true });
        modalRef.componentInstance.id = id;
        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, TicketOverviewComponent, NgbScrollSpyModule, AttachmentComponent],
    selector: 'app-ticket-modal',
    templateUrl: './ticket-modal.component.html',
    styleUrls: []
})
export class TicketModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private api: JobService,
        private fb: FormBuilder,
        private tokenStorageService: TokenStorageService,
        private teamService: TeamService,
        private publicAttachment: PublicAttachment,
        private attachmentService: AttachmentService,
    ) {
    }


    ngOnInit(): void {
    }

    currentSection = 'item-1'

    viewAttachment(url) {
        window.open(url, '_blank');
    }

    attachments: any = []
    async getAttachments() {
        this.attachments = await this.attachmentService.getAllRelatedAttachments(this.id)
    }

    setFormElements = ($event) => {
        this.form = $event;

        this.form.patchValue({
            job: {
                request_date: this.request_date,
                start_time: this.start_time
            }
        })
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

    async getData() {
        try {
            let data = await this.api.getById(this.id)
            this.getAttachments()
            this.form.patchValue({ job: data })
        } catch (err) { }
    }

}
