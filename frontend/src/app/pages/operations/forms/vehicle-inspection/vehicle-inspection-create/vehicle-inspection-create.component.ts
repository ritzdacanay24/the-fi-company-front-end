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

  useSplitSidePhotos = false;

  vehiclePhotos: {
    front: File | null,
    rear: File | null,
    left: File | null,
    right: File | null,
    left_front: File | null,
    left_rear: File | null,
    right_front: File | null,
    right_rear: File | null
  } = {
    front: null,
    rear: null,
    left: null,
    right: null,
    left_front: null,
    left_rear: null,
    right_front: null,
    right_rear: null
  };

  vehiclePhotoPreviews: {
    front: string | null,
    rear: string | null,
    left: string | null,
    right: string | null,
    left_front: string | null,
    left_rear: string | null,
    right_front: string | null,
    right_rear: string | null
  } = {
    front: null,
    rear: null,
    left: null,
    right: null,
    left_front: null,
    left_rear: null,
    right_front: null,
    right_rear: null
  };

  additionalVehiclePhotos: File[] = [];
  additionalVehiclePhotoPreviews: string[] = [];

  onVehiclePhotoChange(
    event: any,
    position: 'front' | 'rear' | 'left' | 'right' | 'left_front' | 'left_rear' | 'right_front' | 'right_rear'
  ) {
    const file = event.target.files[0];
    if (file) {
      this.vehiclePhotos[position] = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.vehiclePhotoPreviews[position] = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeVehiclePhoto(position: 'front' | 'rear' | 'left' | 'right' | 'left_front' | 'left_rear' | 'right_front' | 'right_rear') {
    this.vehiclePhotos[position] = null;
    this.vehiclePhotoPreviews[position] = null;
  }

  onAdditionalVehiclePhotosChange(event: any) {
    const files: File[] = Array.from(event?.target?.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      this.additionalVehiclePhotos.push(file);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.additionalVehiclePhotoPreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  removeAdditionalVehiclePhoto(index: number) {
    this.additionalVehiclePhotos.splice(index, 1);
    this.additionalVehiclePhotoPreviews.splice(index, 1);
  }

  areAllVehiclePhotosUploaded(): boolean {
    if (this.form?.value?.not_used) {
      return true;
    }
    const baseRequired = !!(this.vehiclePhotos.front && this.vehiclePhotos.rear);

    if (this.useSplitSidePhotos) {
      return baseRequired && !!(
        this.vehiclePhotos.left_front &&
        this.vehiclePhotos.left_rear &&
        this.vehiclePhotos.right_front &&
        this.vehiclePhotos.right_rear
      );
    }

    return baseRequired && !!(this.vehiclePhotos.left && this.vehiclePhotos.right);
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

    // Check if all vehicle photos are uploaded
    if (!this.areAllVehiclePhotosUploaded()) {
      this.toastrService.error(
        this.useSplitSidePhotos
          ? "Please upload all required vehicle photos (front, rear, left front, left rear, right front, and right rear views)."
          : "Please upload all required vehicle photos (front, rear, left, and right views).",
        "Missing Vehicle Photos"
      );
      return;
    }

    try {
      this.isLoading = true;
      let { insertId } = await this.api._create(this.form.value);

      // Upload vehicle photos with specific labels
      const photoPositions = this.useSplitSidePhotos
        ? (['front', 'rear', 'left_front', 'left_rear', 'right_front', 'right_rear'] as const)
        : (['front', 'rear', 'left', 'right'] as const);

      const titleMap: Record<typeof photoPositions[number], string> = {
        front: 'Vehicle Front View',
        rear: 'Vehicle Rear View',
        left: 'Vehicle Left Side View',
        right: 'Vehicle Right Side View',
        left_front: 'Vehicle Left Side (Front) View',
        left_rear: 'Vehicle Left Side (Rear) View',
        right_front: 'Vehicle Right Side (Front) View',
        right_rear: 'Vehicle Right Side (Rear) View'
      };

      for (const position of photoPositions) {
        if (this.vehiclePhotos[position]) {
          const formData = new FormData();
          formData.append("file", this.vehiclePhotos[position]!);
          formData.append("field", "Vehicle Inspection");
          const resolvedTitle = titleMap[position] || `Vehicle ${position} View`;
          formData.append("title", resolvedTitle);
          formData.append("uniqueData", insertId);
          formData.append("folderName", "vehicleInformation");
          this.uploadService
            .upload(formData)
            .pipe(first())
            .subscribe((data) => { });
        }
      }

      if (this.additionalVehiclePhotos.length > 0) {
        this.additionalVehiclePhotos.forEach((file, index) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("field", "Vehicle Inspection");
          formData.append("title", `Vehicle Additional Photo ${index + 1}`);
          formData.append("uniqueData", insertId);
          formData.append("folderName", "vehicleInformation");
          this.uploadService
            .upload(formData)
            .pipe(first())
            .subscribe((data) => { });
        });
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
