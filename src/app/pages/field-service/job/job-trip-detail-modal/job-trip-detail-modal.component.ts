

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobService } from "@app/core/api/field-service/job.service";
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { UserService } from '@app/core/api/field-service/user.service';
import { AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';
import { AttachmentService } from '@app/core/api/field-service/attachment.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { states } from '@app/core/data/states';

@Injectable({
  providedIn: 'root'
})
export class JobTripDetailModalService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(id) {
    let modalRef = this.modalService.open(JobTripDetailModalComponent, { size: 'lg', windowClass: 'field-service-modal-xxl' });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, NgbScrollSpyModule, AddressSearchComponent],
  selector: 'app-job-modal-create',
  templateUrl: './job-trip-detail-modal.component.html',
  styleUrls: []
})
export class JobTripDetailModalComponent implements OnInit {

  constructor(
    private fb: FormBuilder,
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: JobService,
    private userService: UserService,
    private publicAttachment: PublicAttachment,
    private attachmentService: AttachmentService,
    public authenticationService: AuthenticationService
  ) {
  }

  ngOnInit(): void {
  }

  notifyParent($event: any) {

  }

  states = states;

  @Input() id: any

  trip_selection = ""

  currentSection = 'item-1'

  setFormElements = async ($event: any) => {
    this.form = $event;

    this.form.patchValue({
      rental_car: {
        rental_car_driver: "",
        rental_car_pickup_datetime: "",
        rental_car_dropoff_datetime: "",
        rental_car_confirmation_number: "",
        address: {
          rental_car_name: "",
          rental_car_address: "",
          rental_car_address1: "",
          rental_car_address_state: "",
          rental_car_address_zip_code: "",
          rental_car_address_city: "",
        },
        rental_car_created_by: this.authenticationService.currentUserValue.id,
        rental_car_created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
      }
    }, { emitEvent: false })

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

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }
  //check if this will be used in the window pop up

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
