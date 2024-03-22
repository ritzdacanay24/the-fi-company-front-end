

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { JobFormComponent } from "../job-form/job-form.component";
import { JobService } from "@app/core/api/field-service/job.service";
import { NgbActiveModal, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { SharedModule } from '@app/shared/shared.module';
import { TokenStorageService } from '@app/core/services/token-storage.service';
import { TeamService } from '@app/core/api/field-service/fs-team.service';
import { AttachmentService } from '@app/core/api/field-service/attachment.service';
import { JobEditComponent } from '../job-edit/job-edit.component';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent, NgbScrollSpyModule, JobEditComponent],
  selector: 'app-job-modal-edit',
  templateUrl: './job-modal-edit.component.html',
  styleUrls: []
})
export class JobModalEditComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: JobService,
    private fb: FormBuilder,
    private tokenStorageService: TokenStorageService,
    private teamService: TeamService,
    private authenticationService: AuthenticationService
  ) {
  }

  ngOnInit(): void {
  }

  removeTech = async ($event, value) => {
    if (value.id) {
      const { value: accept } = await SweetAlert.confirm({ title: "Are you sure you want to remove?", text: "" });
      if (!accept) return; await this.teamService.delete(value.id)
    }
    this.teams.removeAt($event);
  }

  viewAttachment(url) {
    window.open(url, '_blank');
  }

  setFormElements = ($event) => {
    this.form = $event;
    if (this.id) this.getData();
  }

  @Input() ngStyle = { 'height': 'calc(100vh - 222px)' }
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

  async onSubmit() {
    this.submitted = true;
    if (this.id) {
      this.update()
    } else {
      this.create()
    }
  }

  async create() {
    this.submitted = true;

    if (this.form.invalid && this.form.value?.job?.active == 1) {
      getFormValidationErrors()
      return
    };

    this.form.patchValue({
      job: {
        created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        created_by: this.tokenStorageService.authUser.id
      }
    })

    try {
      await this.api.create(this.form.value)
      this.close()
    } catch (err) {
    }
  }

  async update() {
    this.submitted = true;

    if (this.form.invalid && this.form.value?.job?.active == 1) {
      getFormValidationErrors()
      return
    };

    try {
      await this.api.update(this.id, this.form.value)
      this.close()
    } catch (err) {

    }
  }

  async onDelete() {
    try {
      await this.api.delete(this.id)
      this.close()
    } catch (err) {

    }
  }

  data
  async getData() {
    try {
      let data = this.data = await this.api.getById(this.id)
      this.form.patchValue({ job: data })
      this.getTeams()
    } catch (err) { }
  }

  teams: FormArray;
  async getTeams() {
    let data = await this.teamService.find({ fs_det_id: this.id })
    if (data) {
      this.teams = this.form.get('resource') as FormArray;
      for (let i = 0; i < data.length; i++) {
        this.teams.push(this.fb.group(data[i]))
      }

    }
  }

  duplicateJob() {
    this.id = null;
    delete this.form.value.id;

    this.form.patchValue({
      job: {
        invoice_date: null,
        vendor_inv_number: '',
        vendor_cost: '',
        invoice_number: this.form.value.billable == 'No' ? this.form.value.billable : '',
        id: null,
        invoice_notes: '',
        invoice: '',
        acc_status: '',
        created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        created_by: this.authenticationService.currentUserValue.id,
        paper_work_location: null,
        billable_flat_rate_or_po: '',
        contractor_inv_sent_to_ap: '',
        period: '',
        customer_cancelled: '',
        cancellation_comments: '',
        cancelled_type: '',
      }
    }, { emitEvent: false });

    this.form.enable();
  }


  onPrint() {
    setTimeout(() => {
      var printContents = document.getElementById('print').innerHTML;
      var popupWin = window.open('', '_blank', 'width=1000,height=600');
      popupWin.document.open();

      popupWin.document.write(`
        <html>
          <head>
            <title>Material Request Picking</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <style>
            @page {
              size: portrait;
              padding: 5 !important;
            }
            </style>
          </head>
          <body onload="window.print();window.close()">${printContents}</body>
        </html>`
      );

      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  }

}
