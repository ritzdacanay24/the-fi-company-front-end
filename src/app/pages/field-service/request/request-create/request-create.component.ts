import { Component, Input } from '@angular/core';
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

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
          formData.append("uniqueData", `${data.id}`);
          formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
          try {
            await this.attachmentsService.uploadfile(formData)
          } catch (err) { }
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

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

}
