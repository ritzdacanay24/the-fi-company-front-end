import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../request-constant';
import { RequestFormComponent } from '../request-form/request-form.component';
import { RequestService } from '@app/core/api/field-service/request.service';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { CommentsService } from '@app/core/api/field-service/comments.service';
import moment from 'moment';
import { JobFormComponent } from '../../job/job-form/job-form.component';
import { RequestScheduleJobComponent } from '../request-schedule-job/request-schedule-job.component';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { FIELD_SERVICE } from '../../field-service-constant';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { getFormValidationErrors } from 'src/assets/js/util';
import { AutosizeModule } from 'ngx-autosize';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SafeHtmlPipe } from '@app/shared/pipes/safe-html.pipe';
import { TechScheduleModalService } from '../../scheduler/tech-schedule/tech-schedule-modal/tech-schedule-modal.component';
import { JobModalCreateService } from '../../job/job-modal-create/job-modal-create.component';
import { JobService } from '@app/core/api/field-service/job.service';
import { JobModalService } from '../../job/job-modal-edit/job-modal.service';

@Component({
  standalone: true,
  imports: [SharedModule, RequestFormComponent, JobFormComponent, RequestScheduleJobComponent, AutosizeModule, SafeHtmlPipe],
  selector: 'app-request-edit',
  templateUrl: './request-edit.component.html',
  styleUrls: ['./request-edit.component.scss']
})
export class RequestEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private requestService: RequestService,
    private toastrService: ToastrService,
    private schedulerService: SchedulerService,
    private commentsService: CommentsService,
    private cdref: ChangeDetectorRef,
    private attachmentsService: AttachmentsService,
    private authenticationService: AuthenticationService,
    public techScheduleModalService: TechScheduleModalService,
    private jobModalCreateService: JobModalCreateService,
    private jobService: JobService,
    private jobModalEditService: JobModalService,
  ) {

    this.name = this.authenticationService.currentUserValue.full_name
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['request_id'] || params['id'];
      this.addToSchedule = params['addToSchedule']
      this.viewComment = params['viewComment']
      this.goBackUrl = params['goBackUrl']
    });

    if (this.id) this.getData();
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  viewComment = false;
  goBackUrl;

  title = "Edit Request";

  form: FormGroup;

  formScheduler: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge' });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    }
  }
  @Input() goBackToRequest: Function = () => {
    this.addToSchedule = false;
    this.router.navigate(['.'], {
      queryParams: {
        addToSchedule: null
      },
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge'
    });
    this.getData()
  }

  data: any;

  schedulerInfo


  attachments
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({ field: 'Field Service Request', uniqueId: this.id });
  }

  async deleteAttachment(id) {

    const { value: accept } = await SweetAlert.confirm();

    if (!accept) return;

    try {
      SweetAlert.loading('Deleting. Please wait.')
      await this.attachmentsService.delete(id)
      await this.getData();
      SweetAlert.close()
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  UPLOAD_LINK = FIELD_SERVICE.UPLOAD_LINK

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
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

  disabled = false;

  async getData() {
    try {
      this.data = await this.requestService.getById(this.id);
      this.schedulerInfo = await this.schedulerService.findOne({ request_id: this.id });

      if (this.data?.cc_email) {
        this.data.cc_email = this.data.cc_email.split(',')
      }


      if (this.schedulerInfo) {
        this.form.disable();
      }

      this.form.get('g-recaptcha-response').clearValidators();
      this.form.get('g-recaptcha-response').updateValueAndValidity();
      this.form.get('g-recaptcha-response').disable();

      this.form.patchValue(this.data);

      await this.getAttachments()

      await this.getComments();

      if (this.viewComment) {
        this.goToComments()
      }

    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.value?.cc_email) {
      this.form.value.cc_email = this.form.value?.cc_email?.toString()
    }

    this.schedulerInfo = await this.schedulerService.findOne({ request_id: this.id });

    if (this.schedulerInfo) {
      alert('FSID already created. Unable to modify')
      return;
    }

    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors()
      return
    };

    try {
      this.isLoading = true;
      await this.requestService.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      //this.goBack();
      this.form.markAsPristine()
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  comments: any = []
  async getComments() {
    this.comments = await this.commentsService.getByRequestId(this.id);
  }

  name = "";
  comment = ""
  async onSubmitComment() {

    if (this.name == "" || this.comment == "") {
      alert('All comment fields required')
      return
    }

    SweetAlert.loading("Saving. Please wait.")
    try {
      await this.commentsService.createComment(this.form.value.token, this.form.value.email, {
        name: this.name,
        comment: this.comment,
        fs_request_id: this.id,
        created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
      });
      this.comment = "";
      await this.getComments();
      SweetAlert.close()
    } catch (err) {
      alert(`Something went wrong. Please contact administrator`)
      SweetAlert.close(0)

    }

  }

  goToComments() {
    setTimeout(() => {
      document.getElementById("mydiv1").scrollIntoView();
    }, 0);
  }

  addToSchedule = false;
  jobInfo;
  async scheduleRequest() {
    try {

      this.jobInfo = await this.jobService.findOne({ request_id: this.id })

      if (this.jobInfo) {
        let modalRef = this.jobModalEditService.open(this.jobInfo.id)
        modalRef.result.then(async (result: any) => {
          await this.getData()
        }, () => {
        });
        return;
      }


      let res = await this.requestService.getById(this.id)

      let d = {
        job: {
          request_date: res.date_of_service,
          origina_request_date: res.date_of_service,
          start_time: res.start_time,
          service_type: res.type_of_service,
          requested_by: res.requested_by,
          customer: res.customer,
          billable: 'Yes',
          onsite_customer_name: res.onsite_customer_name,
          onsite_customer_phone_number: res.onsite_customer_phone_number,
          licensing_required: res.licensing_required,
          sign_jacks: res.sign_jacks,
          platform: res.platform,
          city: res.city,
          eyefi_customer_sign_part: res.eyefi_customer_sign_part,
          property: res.property,
          state: res.state,
          zip_code: res.zip,
          address1: res.address1,
          address2: res.address2,
          ceiling_height: res.ceiling_height,
          sign_theme: res.sign_theme,
          sign_type: res.type_of_sign,
          sales_order_number: res.so_number,
          co_number: res.customer_co_number,
          bolt_to_floor: res.bolt_to_floor,
          fs_lat: res.lat,
          fs_lon: res.lon,
          request_id: this.id,
          site_survey_requested: res.site_survey_requested,
          comments: `
${res.special_instruction || 'No Comments'}

-------

Serial #: ${res.serial_number || ''}
Customer Sign Part #: ${res.eyefi_customer_sign_part || ''}
Sign Manufacture: ${res.sign_manufacture || ''}
Customer Product #: ${res.customer_product_number || ''}
          `,
          sign_responsibility: 'N/A'

        }
      };

      let modalRef = this.jobModalCreateService.open(d)
      modalRef.result.then(async (result: any) => {
        this.disabled = true
        try {
          this.comment = "This has been added to the calendar."
          await this.onSubmitComment()
        } catch (err) {
          alert('Unable to send confirmation message')
        } finally {
          this.getData()
        }
      }, () => {

      });
    } catch (err) {
    }
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
