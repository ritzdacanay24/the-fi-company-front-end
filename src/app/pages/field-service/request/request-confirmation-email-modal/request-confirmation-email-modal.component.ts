

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobService } from "@app/core/api/field-service/job.service";
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { UserService } from '@app/core/api/field-service/user.service';
import { AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';
import { AttachmentService } from '@app/core/api/field-service/attachment.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { SafeHtmlPipe } from '@app/shared/pipes/safe-html.pipe';

import { QuillModule, QuillModules } from 'ngx-quill';

import "quill-mention";

import Quill from 'quill';

@Injectable({
    providedIn: 'root'
})
export class RequestConfirmationEmailModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(RequestConfirmationEmailModalComponent, { size: 'lg' });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [
        SharedModule,
        QuillModule,
        SafeHtmlPipe
    ],
    selector: 'app-request-confirmation-email-modal',
    templateUrl: './request-confirmation-email-modal.component.html',
    styleUrls: []
})
export class RequestConfirmationEmailModalComponent implements OnInit {

    constructor(
        private fb: FormBuilder,
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private api: JobService,
        private userService: UserService,
        private publicAttachment: PublicAttachment,
        private attachmentService: AttachmentService,
    ) {
    }

    quillConfig = {
        toolbar: {
            container: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'align': [] }], ['link']
            ],
        },
    }

    setFocus(editor: any) {
        editor?.focus()
    }


    text = '';
    ngOnInit(): void {
        this.text = `
        <p>Request ID: ${this.data.id}</p>
    
        <p>View Request: <a href="https://dashboard.eye-fi.com/dist/fsm/new-web/request?token=${this.data.token}&viewComment=1">Request</a> </p><br/>
        
        <p>Dear ${this.data.requested_by},</p> <br/>
        
        <p style="text-indent: 200px;"> This email is to confirm your upcoming appointment on ${this.data.date_of_service} at ${this.data.start_time} at ${this.data.property} . Please let us know if you have any questions or concerns before the day of your appointment.</p><br/>
        <p style="text-indent: 200px;"> Also, please note that our cancellation policy states that all cancellations must be made at least 48 hours in advance or a full fee may be charged.</p>
        
        <p> We look forward to seeing you soon!</p><br/><br/>
        
        <p>Sincerely,</p>
        
        <p>The Fi Company</p>
    
        `
    }

    @Input() data: any


    currentSection = 'item-1'

    setFormElements = async ($event) => {
        this.form = $event;

        this.form.patchValue({ job: this.data?.job }, { emitEvent: false })

        this.teams = this.form.get('resource') as FormArray;
        if (this.data.resource) {
            await this.getTeams(this.data.resource);
        }
    }





    teams: FormArray;
    async getTeams(id) {
        try {
            let data: any = await this.userService.getUserWithTechRateById(id);
            this.teams.push(this.fb.group({
                user: data.user,
                fs_det_id: "",
                lead_tech: 0,
                id: data.id,
                contractor_code: null,
                title: data.title
            }))

        } catch (err) {
        }
    }


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

    async onSubmit() {
        this.submitted = true;

        if (this.form.invalid) {
            getFormValidationErrors()
            return
        }
        this.create()
    }

    async create() {

        try {
            let data = await this.api.create(this.form.value);
            await this.onUploadAttachments(data.insertId)
            this.close()
        } catch (err) {

        }
    }

    removeTech = ($event) => {
        this.teams.removeAt($event.index);
    }


    file: File = null;

    myFiles: string[] = [];

    onFilechange(event: any) {
        this.myFiles = [];
        for (var i = 0; i < event.target.files.length; i++) {
            this.myFiles.push(event.target.files[i]);
        }
    }

    isLoading = false
    async onUploadAttachments(id) {
        if (this.myFiles) {
            let totalAttachments = 0;
            this.isLoading = true;
            const formData = new FormData();
            for (var i = 0; i < this.myFiles.length; i++) {
                formData.append("file", this.myFiles[i]);
                formData.append("field", 'Field Service Scheduler');
                formData.append("uniqueData", `${id}`);
                formData.append("folderName", 'fieldService');
                try {
                    await this.publicAttachment.uploadfile(formData);
                    totalAttachments++
                } catch (err) {
                }
            }
            this.isLoading = false;
        }
    }


}
