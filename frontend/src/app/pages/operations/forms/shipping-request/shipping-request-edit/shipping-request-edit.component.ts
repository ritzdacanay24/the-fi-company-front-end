import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../shipping-request-constant";
import { ShippingRequestFormComponent } from "../shipping-request-form/shipping-request-form.component";
import { ShippingRequestService } from "@app/core/api/operations/shippging-request/shipping-request.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IShippingRequestForm } from "../shipping-request-form/shipping-request-form.type";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UploadedAttachmentsListComponent } from "@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";
import { UploadTriggerMode } from "@app/shared/components/attachments/attachment-upload.types";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ShippingRequestFormComponent,
    UploadedAttachmentsListComponent,
    UploadNewAttachmentsComponent,
  ],
  selector: "app-shipping-request-edit",
  templateUrl: "./shipping-request-edit.component.html",
})
export class ShippingRequestEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShippingRequestService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.id = this.activatedRoute.snapshot.queryParamMap.get("id");
    this.formDisabled = !!this.id;

    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.formDisabled = !!this.id;
    });

    if (this.id) this.getData();
  }

  title = "Edit Shipping Request";

  form: MyFormGroup<IShippingRequestForm>;

  id = null;

  isLoading = false;

  submitted = false;

  // When true child form will call form.disable() and then keep tracking enabled
  formDisabled = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      if (this.data?.sendTrackingNumberTo)
        this.data.sendTrackingNumberTo =
          this.data?.sendTrackingNumberTo?.split(",");
      // If child form already emitted, patch it. Otherwise onFormReady will patch once form is ready.
      if (this.form) {
        this.form.patchValue(this.data);
      }
      // For edit page, disable the form except tracking number
      this.formDisabled = !!this.id;
      await this.getAttachments();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  // Handler when child form component emits the FormGroup
  onFormReady(f: MyFormGroup<IShippingRequestForm>) {
    this.form = f;
    // If data already loaded, apply it to the form
    if (this.data) this.form.patchValue(this.data);
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
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  getStatus(): string {
    const status = String(this.data?.status || '').trim();
    if (status) {
      return status;
    }

    if (this.data?.completedDate && this.data.completedDate !== 'N/A') {
      return 'Completed';
    }

    if (this.data?.trackingNumber && this.data.trackingNumber !== 'N/A') {
      return 'In Transit';
    }

    if (this.data?.active === false || Number(this.data?.active) === 0) {
      return 'Cancelled';
    }

    return 'Pending';
  }

  getStatusBadgeClass(): string {
    const status = this.getStatus();
    switch (status) {
      case 'Completed':
        return 'bg-success';
      case 'In Transit':
        return 'bg-info';
      case 'Cancelled':
        return 'bg-danger';
      default:
        return 'bg-warning';
    }
  }

  onEdit() {
    this.formDisabled = false;
    this.toastrService.info("Edit mode enabled");
  }

  async onArchive() {
    if (!this.id || !this.form) return;
    const result = await SweetAlert.confirm({
      title: `Archive Shipping Request #${this.id}?`,
      text: "Archived records are removed from active lists.",
      icon: "warning",
      confirmButtonText: "Yes, archive",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      this.isLoading = true;
      const payload = {
        ...this.form.getRawValue(),
        active: 0,
      };

      await this.api.update(this.id, payload);
      this.isLoading = false;
      this.toastrService.success("Shipping request archived successfully");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error("Failed to archive shipping request");
    }
  }

  async onDelete() {
    if (!this.id) return;
    const result = await SweetAlert.confirm({
      title: `Delete Shipping Request #${this.id}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      this.isLoading = true;
      await this.api.delete(this.id);
      this.isLoading = false;
      this.toastrService.success("Shipping request deleted successfully");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error("Failed to delete shipping request");
    }
  }

  attachments: any = [];
  uploadTriggerMode: UploadTriggerMode = "on-add";
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({
      field: "shippingRequest",
      uniqueId: this.id,
    });
  }

  async deleteAttachment(id, index) {
    const result = await SweetAlert.confirm({
      title: "Remove attachment?",
      text: "This will permanently remove the attachment from this shipping request.",
      icon: "warning",
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  selectedFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  async onUploadAttachments() {
    if (this.selectedFiles.length > 0) {
      let totalAttachments = 0;
      this.isLoading = true;
      for (const file of this.selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("field", "shippingRequest");
        formData.append("uniqueData", `${this.id}`);
        formData.append("subFolder", "shippingRequest");
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++;
        } catch (err) {}
      }
      this.selectedFiles = [];
      this.isLoading = false;
      await this.getAttachments();
    }
  }

  updateTracking = async () => {
    try {
      this.isLoading = true;
      await this.api.update(this.id, {
        sendTrackingNumberTo: this.form.value.sendTrackingNumberTo,
        sendTrackingEmail: true,
        trackingNumber: this.form.value.trackingNumber,
        completedBy: this.authenticationService.currentUserValue.id,
        completedDate: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  };

  onPrint() {
    setTimeout(() => {
      var printContents = document.getElementById("print").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
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
      </html>`);

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
