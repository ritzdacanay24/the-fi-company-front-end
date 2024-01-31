import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../shipping-request-constant';
import { ShippingRequestFormComponent } from '../shipping-request-form/shipping-request-form.component';
import { ShippingRequestService } from '@app/core/api/operations/shippging-request/shipping-request.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { IShippingRequestForm } from '../shipping-request-form/shipping-request-form.type';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  standalone: true,
  imports: [SharedModule, ShippingRequestFormComponent],
  selector: 'app-shipping-request-edit',
  templateUrl: './shipping-request-edit.component.html'
})
export class ShippingRequestEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShippingRequestService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: MyFormGroup<IShippingRequestForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  data: any;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      if (this.data?.sendTrackingNumberTo)
        this.data.sendTrackingNumberTo = this.data?.sendTrackingNumberTo?.split(',')
      this.form.patchValue(this.data);
      await this.getAttachments()
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    }

    this.form.value.sendTrackingNumberTo = this.form.value.sendTrackingNumberTo?.toString()

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
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

  attachments: any = []
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({ field: 'shippingRequest', uniqueId: this.id })
  }

  async deleteAttachment(id, index) {
    if (!confirm('Are you sure you want to remove attachment?')) return
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1)
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "shippingRequest");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", 'shippingRequest');
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

  updateTracking = async () => {
    try {
      this.isLoading = true;
      await this.api.update(this.id, {
        trackingNumber: this.form.value.trackingNumber,
        completedBy: this.authenticationService.currentUserValue.id,
        completedDate: moment().format('YYYY-MM-DD HH:mm:ss')
      });
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

}
