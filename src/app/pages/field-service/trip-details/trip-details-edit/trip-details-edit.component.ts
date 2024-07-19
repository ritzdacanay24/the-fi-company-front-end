import { Component, Input } from "@angular/core";
import { FormArray, FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { NAVIGATION_ROUTE } from "../trip-details-constant";
import { TripDetailsSummaryComponent } from "../trip-details-summary/trip-details-summary.component";
import { _compressToEncodedURIComponent } from "src/assets/js/util/jslzString";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import moment from "moment";
import { ToastrService } from "ngx-toastr";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    TripDetailsFormComponent,
    TripDetailsSummaryComponent,
  ],
  selector: "app-trip-details-edit",
  templateUrl: "./trip-details-edit.component.html",
})
export class TripDetailsEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: TripDetailService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;
  details: FormArray;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      this.isLoading = false;
    } catch (err) {}
  }

  viewTripDetailById = (id) => {
    this.id = id;
    this.getData();
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
      },
    });
  };

  setDatData: any;
  async onSubmit() {
    this.submitted = true;
    let d = {
      ...this.form.value,
      ...this.form.value.address,
    };

    try {
      await this.api.update(this.id, d);
      this.toastrService.success("Updated successfully");
      this.setDatData();
    } catch (err) {}
  }

  async onDelete() {
    if (!confirm("Are you sure you want to delete?")) return;
    try {
      await this.api.delete(this.id);
    } catch (err) {}
  }

  onCancel() {
    this.goBack();
  }

  async emailTripDetails() {
    if (!confirm("Are you sure you want to send email?")) return;
    try {
      SweetAlert.loading("Sending email. Please wait..");
      await this.api.emailTripDetails(this.id, this.data);

      for (let i = 0; i < this.data.length; i++) {
        this.data[i].email_sent = moment().format("YYYY-MM-DD HH:mm:ss");
      }

      SweetAlert.close();
    } catch (err) {
      SweetAlert.close();
    }
  }
}
