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
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [SharedModule, ShippingRequestFormComponent],
  selector: "app-shipping-request-edit",
  templateUrl: "./shipping-request-edit.component.html",
})
export class ShippingRequestEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShippingRequestService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
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

  readonly attachmentFeature = FeatureType.SHIPPING_REQUEST;

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
    // If this is an edit, instruct child to disable the form (child handles keeping tracking editable)
    this.formDisabled = !!this.id;
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
    if (!confirm(`Archive shipping request #${this.id}?`)) return;

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
    if (!confirm(`Delete shipping request #${this.id}? This cannot be undone.`)) return;

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
