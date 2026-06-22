import { Component, Input, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../request-constant';
import { RequestService } from '@app/core/api/field-service/request.service';
import { RequestFormComponent } from '../request-form/request-form.component';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { FIELD_SERVICE } from '../../field-service-constant';
import moment from 'moment';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  standalone: true,
  imports: [SharedModule, RequestFormComponent],
  selector: 'app-request-create',
  templateUrl: './request-create.component.html',
  styleUrls: ['./request-create.component.scss']
})
export class RequestCreateComponent {
  @ViewChild('requestFormRef') requestForm: RequestFormComponent;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {
  }

  title = "Create request";

  form: FormGroup;
  requestToken: string | null = null;
  requestId: number | null = null;

  isLoading = false;

  sendEmail = true

  submitted = false;

  showCaptcha = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id: id } });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      email: this.authenticationService.currentUserValue.email,
      created_by: this.authenticationService.currentUserValue.id,
      created_date: moment().format('YYYY-MM-DD HH:mm:ss')
    })

    if (!this.showCaptcha) {
      this.form.get('g-recaptcha-response').clearValidators();
      this.form.get('g-recaptcha-response').updateValueAndValidity();
      this.form.get('g-recaptcha-response').disable();
    }

  }

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue({ created_date: moment().format('YYYY-MM-DD HH:mm:ss') }, { emitEvent: false })

    if (this.form.invalid) {
      getFormValidationErrors()
      return
    }

    try {
      this.isLoading = true;
      let data: any = await this.requestService.createFieldServiceRequest(this.form.value, this.sendEmail);

      // Capture token and ID from response for public attachment uploads
      this.requestToken = data?.token || null;
      this.requestId = data?.id || null;

      // Upload queued attachments if any exist
      if (this.requestForm && this.requestToken && this.requestId) {
        try {
          await this.requestForm.uploadQueuedAttachments();
        } catch (uploadErr) {
          console.warn('Attachment upload failed, but request created successfully', uploadErr);
        }
      }

      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack(data.insertId);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

}
