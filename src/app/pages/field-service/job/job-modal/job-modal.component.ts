

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { JobFormComponent } from "../job-form/job-form.component";
import { JobService } from "@app/core/api/field-service/job.service";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { SharedModule } from '@app/shared/shared.module';
import { TokenStorageService } from '@app/core/services/token-storage.service';

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent],
  selector: 'app-job-modal',
  templateUrl: './job-modal.component.html',
  styleUrls: []
})
export class JobModalComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: JobService,
    private fb: FormBuilder,
    private tokenStorageService: TokenStorageService,
  ) {
  }

  ngOnInit(): void {
    if (this.id) this.getData();
  }

  teams: FormArray;

  setFormElements = ($event) => {
    this.form = $event;

    if (this.techs) {
      this.teams = this.form.get('resource') as FormArray;
      this.teams.push(this.fb.group({ user: this.techs }))
    }

    this.form.patchValue({
      job: {
        request_date: this.request_date,
        start_time: this.start_time
      }
    })
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

  async onSubmit() {
    this.submitted = true;
    if (this.id) {
      this.update()
    } else {
      this.create()
    }
  }

  async create() {

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


  async getData() {
    try {
      let data = await this.api.getById(this.id)
      this.form.patchValue(data)
    } catch (err) {

    }
  }

}
