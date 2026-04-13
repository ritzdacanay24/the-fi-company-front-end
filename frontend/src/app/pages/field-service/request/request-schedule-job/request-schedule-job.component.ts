import { Component, Input, SimpleChanges } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { NAVIGATION_ROUTE } from '../request-constant';
import { RequestFormComponent } from '../request-form/request-form.component';
import { RequestService } from '@app/core/api/field-service/request.service';
import { JobFormComponent } from '../../job/job-form/job-form.component';
import { JobService } from '@app/core/api/field-service/job.service';
import { TeamService } from '@app/core/api/field-service/fs-team.service';
import { RequestConfirmationEmailModalService } from '../request-confirmation-email-modal/request-confirmation-email-modal.component';

@Component({
  standalone: true,
  imports: [SharedModule, RequestFormComponent, JobFormComponent],
  selector: 'app-request-schedule-job',
  templateUrl: './request-schedule-job.component.html',
  styleUrls: ['./request-schedule-job.component.scss']
})
export class RequestScheduleJobComponent {
  constructor(
    private router: Router,
    private jobService: JobService,
    private teamService: TeamService,
    private fb: FormBuilder,
    private requestService: RequestService,
    private requestConfirmationEmailModalService: RequestConfirmationEmailModalService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'].currentValue) {
      this.scheduleRequest()
    }
    // changes.prop contains the old and the new value...
  }

  @Input() addToSchedule

  title = "Edit Request";

  form: FormGroup;

  @Input() id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  data: any;

  schedulerInfo

  async onSubmit() {
    try {
      await this.jobService.create(this.form.value);
      this.form.disable();
      this.goBack()
    } catch (err) {
    }
  }

  onCancel() {
    this.goBack()
  }

  jobInfo;

  teams: FormArray;

  setOnRemoveTech($event) {
    this.teams = this.form.get('resource') as FormArray;
    this.teams.removeAt($event.index)
  }

  async scheduleRequest() {
    this.addToSchedule = true;

    this.jobInfo = await this.jobService.findOne({ request_id: this.id })

    if (this.jobInfo) {

      let teams = await this.teamService.find({ fs_det_id: this.id });

      (this.form.controls['resource'] as FormArray).clear();

      if (teams) {
        this.teams = this.form.get('resource') as FormArray;
        for (let i = 0; i < teams.length; i++) {
          this.teams.push(this.fb.group(teams[i]))
        }
      }

      this.form.patchValue({ job: this.jobInfo, resource: teams });
      return;
    }

    try {


      this.data = await this.requestService.getById(this.id)

      this.form.patchValue({
        job: {
          request_date: this.data.date_of_service,
          start_time: this.data.start_time,
          service_type: this.data.type_of_service,
          requested_by: this.data.requested_by,
          customer: this.data.customer,
          billable: 'Yes',
          onsite_customer_name: this.data.onsite_customer_name,
          onsite_customer_phone_number: this.data.onsite_customer_phone_number,
          licensing_required: this.data.licensing_required,
          sign_jacks: this.data.sign_jacks,
          platform: this.data.platform,
          city: this.data.city,
          eyefi_customer_sign_part: this.data.eyefi_customer_sign_part,
          property: this.data.property,
          state: this.data.state,
          zip_code: this.data.zip,
          address1: this.data.address1,
          address2: this.data.address2,
          ceiling_height: this.data.ceiling_height,
          sign_theme: this.data.sign_theme,
          sign_type: this.data.type_of_sign,
          sales_order_number: this.data.so_number,
          co_number: this.data.customer_co_number,
          bolt_to_floor: this.data.bolt_to_floor,
          request_id: this.id,
          site_survey_requested: this.data.site_survey_requested,
          comments: `
${this.data.special_instruction || 'No Comments'}

-------

Serial #: ${this.data.serial_number || ''}
Customer Sign Part #: ${this.data.eyefi_customer_sign_part || ''}
Sign Manufacture: ${this.data.sign_manufacture || ''}
Customer Product #: ${this.data.customer_product_number || ''}
          `,
          sign_responsibility: 'N/A'

        }
      }, { emitEvent: false });

    } catch (err) {
    }

  }

  onSubmitConfirmationEmail() {
    this.requestConfirmationEmailModalService.open(this.data)
  }

}
