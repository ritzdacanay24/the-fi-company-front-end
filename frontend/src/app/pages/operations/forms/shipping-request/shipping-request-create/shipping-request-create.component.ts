import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { ShippingRequestFormComponent } from "../shipping-request-form/shipping-request-form.component";
import { NAVIGATION_ROUTE } from "../shipping-request-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { ShippingRequestService } from "@app/core/api/operations/shippging-request/shipping-request.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IShippingRequestForm } from "../shipping-request-form/shipping-request-form.type";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [SharedModule, ShippingRequestFormComponent],
  selector: "app-shipping-request-create",
  templateUrl: "./shipping-request-create.component.html",
})
export class ShippingRequestCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShippingRequestService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  ngOnInit(): void {}

  title = "Create Shipping Request";

  form: MyFormGroup<IShippingRequestForm>;

  id = null;

  isLoading = false;

  submitted = false;

  readonly attachmentFeature = FeatureType.SHIPPING_REQUEST;

  pendingAttachmentFiles: File[] = [];

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  setFormEmitter($event) {
    this.form = $event;

    this.form.patchValue(
      {
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        requestorName: this.authenticationService.currentUserValue.full_name,
        emailAddress: this.authenticationService.currentUserValue.email,
        sendTrackingNumberTo: [
          this.authenticationService.currentUserValue.email,
        ],
        createdById: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    this.form.value.sendTrackingNumberTo =
      this.form.value.sendTrackingNumberTo?.toString();
    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      if (this.pendingAttachmentFiles.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          this.attachmentFeature,
          insertId,
          this.pendingAttachmentFiles,
        );

        this.pendingAttachmentFiles = [];
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  onPendingAttachmentsAdded(files: File[]): void {
    if (!Array.isArray(files) || files.length === 0) {
      return;
    }

    this.pendingAttachmentFiles = [...this.pendingAttachmentFiles, ...files];
  }

  removePendingAttachment(index: number): void {
    if (index < 0 || index >= this.pendingAttachmentFiles.length) {
      return;
    }

    this.pendingAttachmentFiles.splice(index, 1);
    this.pendingAttachmentFiles = [...this.pendingAttachmentFiles];
  }
}
