

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup, UntypedFormBuilder } from '@angular/forms';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { states } from '@app/core/data/states';
import { TripDetailService } from '@app/core/api/field-service/trip-detail/trip-detail.service';
import { AutosizeModule } from 'ngx-autosize';

@Injectable({
  providedIn: 'root'
})
export class JobTripDetailModalService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(fsid, id) {
    let modalRef = this.modalService.open(JobTripDetailModalComponent, { size: 'lg' });
    modalRef.componentInstance.fsid = fsid;
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbScrollSpyModule,
    AddressSearchComponent,
    AutosizeModule
  ],
  selector: 'app-job-modal-create',
  templateUrl: './job-trip-detail-modal.component.html',
  styleUrls: []
})
export class JobTripDetailModalComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private publicAttachment: PublicAttachment,
    public authenticationService: AuthenticationService,
    private tripDetailService: TripDetailService,
    private formBuilder: UntypedFormBuilder
  ) {
  }

  getTripSelection($event) {
    for (let i = 0; i < this.trip_selection_options.length; i++) {
      if ($event == this.trip_selection_options[i].value) {
        this.form.patchValue({
          type_of_travel: $event,
          location_name: this.trip_selection_options[i].location_name,
          start_datetime_name: this.trip_selection_options[i].start_datetime_name,
          end_datetime_name: this.trip_selection_options[i].end_datetime_name
        })
        break;
      }
    }
  }

  trip_selection_options = [{
    name: "Rental Car",
    value: "rental_car",
    start_datetime_name: "Pick Up Date/Time",
    end_datetime_name: "Drop Off Date/Time",
    location_name: "Pick Up Location"
  }, {
    name: "Equipment",
    value: "equipment",
    start_datetime_name: "Drop off Date/Time",
    end_datetime_name: "Pick up Date/Time",
    location_name: "Vendor"
  }, {
    name: "Hotel",
    value: "hotel",
    start_datetime_name: "Check In Date/Time",
    end_datetime_name: "Check Out Date/Time",
    location_name: "Hotel Location"
  }, {
    name: "Flight",
    value: "flight",
    start_datetime_name: "Flight Out Date/Time",
    end_datetime_name: "Flight In Date/Time",
    location_name: "Flight Out Location"
  }]

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      start_datetime: "",
      end_datetime: "",
      start_datetime_name: "",
      end_datetime_name: "",
      confirmation: "",
      type_of_travel: null,
      rental_car_driver: "",
      flight_out: "",
      flight_in: "",
      location_name: "",
      airline_name: "",
      notes: "",
      address: this.formBuilder.group({
        address_name: "",
        address: "",
        address1: "",
        state: "",
        zip_code: "",
        city: "",
      }),
    }, { emitEvent: false })

    if (this.id) {
      this.getTripDetail()
    }

  }

  tripDetailInfo: any
  async getTripDetail() {
    this.tripDetailInfo = await this.tripDetailService.getById(this.id);

    this.form.patchValue({
      ...this.tripDetailInfo,
      address: this.tripDetailInfo,
      [this.tripDetailInfo.type_of_travel]: this.tripDetailInfo
    })
  }

  states = states;

  @Input() id: any
  @Input() fsid: any

  trip_selection = ""

  currentSection = 'item-1'

  onTripSelection() {
    this.form.get(this.trip_selection).enable()

  }

  setFormElements = async ($event: any) => {
    this.form = $event;
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

  async onDelete() {
    if (!confirm('Are you sure you want to delete?')) return;
    try {
      await this.tripDetailService.delete(this.id);
      this.close()
    } catch (err) {

    }

  }

  async onSubmit() {
    this.submitted = true;
    // if (this.form.invalid) {
    //   getFormValidationErrors()
    //   return
    // }
    if (this.id) {
      this.edit()
    } else {
      this.create()
    }
  }

  async create() {

    let d = {
      ...this.form.value,
      fsId: this.fsid,
      ...this.form.value.address
    }

    try {
      await this.tripDetailService.create(d);
      this.close()
    } catch (err) {

    }
  }

  async edit() {

    let d = {
      ...this.form.value,
      fsId: this.fsid,
      ...this.form.value.address
    }

    try {
      await this.tripDetailService.update(this.id, d);
      await this.tripDetailService.emailTripDetails(this.fsid, this.tripDetailInfo);
      this.close()
    } catch (err) {

    }
  }

  addTag = ($event) => {
    this.form.patchValue({
      address: {
        address_name: $event
      }
    })

    return true
  }

  notifyParent($event) {
    this.form.patchValue({
      address: {
        address: $event?.fullStreetName,
        city: $event?.address?.localName,
        state: $event?.address?.countrySubdivisionCode || null,
        zip_code: $event?.address?.postalCode,
        address_name: $event?.poi?.name || $event?.address?.streetName
      }
    })
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
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
