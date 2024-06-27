

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobFormComponent } from "../job-form/job-form.component";
import { JobService } from "@app/core/api/field-service/job.service";
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { UserService } from '@app/core/api/field-service/user.service';
import { AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class JobModalCreateService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(data) {
    let modalRef = this.modalService.open(JobModalCreateComponent, { size: 'lg', windowClass: 'field-service-modal-xxl' });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent, NgbScrollSpyModule],
  selector: 'app-job-modal-create',
  templateUrl: './job-modal-create.component.html',
  styleUrls: []
})
export class JobModalCreateComponent implements OnInit {

  constructor(
    private fb: FormBuilder,
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: JobService,
    private userService: UserService,
    private publicAttachment: PublicAttachment,
    public authenticationService: AuthenticationService
  ) {
  }

  ngOnInit(): void {
  }

  @Input() data: any


  currentSection = 'item-1'

  setFormElements = async ($event) => {
    this.form = $event;

    this.form.patchValue({
      job: {
        ...this.data?.job,
        created_by: this.authenticationService.currentUserValue.id,
        created_date: moment().format('YYYY-MM-DD HH:mm:ss')
      }
    }, { emitEvent: false })

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
        title: data.title,
        user_id: data.user_id
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
