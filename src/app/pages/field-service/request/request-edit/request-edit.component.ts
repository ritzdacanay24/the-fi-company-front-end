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
import {AutosizeModule} from 'ngx-autosize';

@Component({
  standalone: true,
  imports: [SharedModule, RequestFormComponent, JobFormComponent, RequestScheduleJobComponent, AutosizeModule],
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
    private attachmentsService: AttachmentsService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.addToSchedule = params['addToSchedule']
    });

    if (this.id) this.getData();
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }


  title = "Edit Request";

  form: FormGroup;

  formScheduler: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
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
      this.goBack();
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
      this.getComments();
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
    this.addToSchedule = true;

    this.router.navigate(['.'], {
      queryParams: {
        addToSchedule: this.addToSchedule
      },
      relativeTo: this.activatedRoute
      , queryParamsHandling: 'merge'
    });

  }
}
