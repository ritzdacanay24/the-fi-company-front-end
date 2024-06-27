import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ShippingRequestFormComponent } from '../shipping-request-form/shipping-request-form.component';
import { NAVIGATION_ROUTE } from '../shipping-request-constant';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ShippingRequestService } from '@app/core/api/operations/shippging-request/shipping-request.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { IShippingRequestForm } from '../shipping-request-form/shipping-request-form.type';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';

@Component({
  standalone: true,
  imports: [SharedModule, ShippingRequestFormComponent],
  selector: 'app-shipping-request-create',
  templateUrl: './shipping-request-create.component.html',
})
export class ShippingRequestCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShippingRequestService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService

  ) { }

  ngOnInit(): void {
  }

  title = "Create Shipping Request";

  form: MyFormGroup<IShippingRequestForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;

    this.form.patchValue({
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      requestorName: this.authenticationService.currentUserValue.full_name,
      emailAddress: this.authenticationService.currentUserValue.email,
      sendTrackingNumberTo: [this.authenticationService.currentUserValue.email],
      createdById: this.authenticationService.currentUserValue.id
    }, { emitEvent: false })

  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    };

    this.form.value.sendTrackingNumberTo = this.form.value.sendTrackingNumberTo?.toString()
    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", "shippingRequest");
          formData.append("uniqueData", `${insertId}`);
          formData.append("folderName", 'shippingRequest');
          await this.attachmentsService.uploadfile(formData)
        }
      }

      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  upload(){}

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }


}
