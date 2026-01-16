import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { FormGroup } from "@angular/forms";
import { NAVIGATION_ROUTE } from "../vehicle-inspection-constant";
import { VehicleInspectionService } from "@app/core/api/operations/vehicle-inspection/vehicle-inspection.service";
import { VehicleInspectionFormComponent } from "../vehicle-inspection-form/vehicle-inspection-form.component";
import { AuthenticationService } from "@app/core/services/auth.service";
import { resetVehicleInspectionFormValues } from "../vehicle-inspection-form/formData";
import { UploadService } from "@app/core/api/upload/upload.service";
import { first } from "rxjs";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleInspectionFormComponent],
  selector: "app-vehicle-inspection-create",
  templateUrl: "./vehicle-inspection-create.component.html",
})
export class VehicleInspectionCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VehicleInspectionService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private uploadService: UploadService
  ) {

    this.activatedRoute.queryParams.subscribe((params) => {
      this.license_plate = params["license_plate"];
      this.not_used = Number(params["not_used"]) || 0;
      
    });

  }

  ngOnInit(): void {
    resetVehicleInspectionFormValues();
  }

  title = "Create Vehicle Inspection";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  hasUnresolvedFailures = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };
  license_plate:any
  not_used:any
  setFormEmitter($event) {
    this.form = $event;

    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        date_created: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.full_name,
        created_by_name: this.authenticationService.currentUserValue.full_name,
        truck_license_plate:this.license_plate || null,
        not_used:this.not_used
      },
      { emitEvent: false }
    );
  }

  details;
  setDetailsFormEmitter($event) {
    this.details = $event?.checklist;
  }

  setFormErrorsEmitter($event) {
  }

  setHasUnresolvedFailures($event) {
    this.hasUnresolvedFailures = $event;
  }

  myFiles: string[] | any = [];
  onFileChange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onSubmit() {
    this.submitted = true;
    this.form.value.details = this.details;

    // Check if form is valid
    if (this.form.invalid) {
      this.toastrService.error(
        "Please fill in all required fields before submitting.",
        "Form Validation Error"
      );
      return;
    }

    // Prevent submission if there are unresolved failures
    if (this.hasUnresolvedFailures) {
      this.toastrService.error(
        "Cannot submit inspection with unresolved failures. Please resolve all issues before submitting.",
        "Unresolved Failures"
      );
      return;
    }

    try {
      this.isLoading = true;
      let { insertId } = await this.api._create(this.form.value);

      const formData = new FormData();

      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "Vehicle Inspection");
        formData.append("uniqueData", insertId);
        formData.append("folderName", "vehicleInformation");
        this.uploadService
          .upload(formData)
          .pipe(first())
          .subscribe((data) => { });
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");

      resetVehicleInspectionFormValues();

      this.router.navigate([NAVIGATION_ROUTE.LIST]);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
