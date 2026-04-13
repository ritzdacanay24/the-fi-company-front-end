import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { NAVIGATION_ROUTE } from "../vehicle-inspection-constant";
import { VehicleInspectionService } from "@app/core/api/operations/vehicle-inspection/vehicle-inspection.service";
import { VehicleInspectionFormComponent } from "../vehicle-inspection-form/vehicle-inspection-form.component";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleInspectionFormComponent],
  selector: "app-vehicle-inspection-edit",
  templateUrl: "./vehicle-inspection-edit.component.html",
})
export class VehicleInspectionEditComponent {
  constructor(
    private router: Router,
    private api: VehicleInspectionService,
    private vehicleService: VehicleService,
    private toastrService: ToastrService,
    private activatedRoute: ActivatedRoute,
    private fb: FormBuilder
  ) {}

  getFormValues() {
    return {
      truck_license_plate: ["", Validators.required],
      details: this.fb.array([]),
      comments: [""],
      date_created: [""],
      create: [1],
      created_by: ["", Validators.required],
      created_by_name: ["", Validators.required],
      files: this.fb.group({
        name: ["", Validators.required],
        file: ["", Validators.required],
        uniqueId: [null],
      }),
    };
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit Vehicle Inspection";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data;

  getImageUrl(attachment): string {
    if (!attachment?.link || !attachment?.directory) return '';
    
    // Extract the relative path after 'attachments/'
    const linkParts = attachment.link.split('/attachments/');
    const relativePath = linkParts.length > 1 ? linkParts[1] : attachment.fileName;
    
    return `${attachment.directory}/${relativePath}`;
  }

  viewImage(attachment) {
    const url = this.getImageUrl(attachment);
    if (url) {
      window.open(url, '_blank');
    }
  }

  setFormErrorsEmitter($event){
  }

  compare(a, b) {
    if (a.name > b.name) {
      return -1;
    }
    if (a.name < b.name) {
      return 1;
    }
    return 0;
  }
  formValues;

  info: any;
  async getVehicleInfo(license) {
    this.info = await this.vehicleService.findOne({ licensePlate: license });
  }

  attachments = [];
  private readonly vehiclePhotoTitles = {
    front: ['Vehicle Front View'],
    rear: ['Vehicle Rear View'],
    left: ['Vehicle Left Side View', 'Vehicle Left Side (Front) View', 'Vehicle Left Side (Rear) View'],
    right: ['Vehicle Right Side View', 'Vehicle Right Side (Front) View', 'Vehicle Right Side (Rear) View']
  };
  getData = async () => {
    try {
      this.isLoading = true;
      let data = await this.api._searchById(this.id);
      await this.getVehicleInfo(data.main?.truck_license_plate);

      this.attachments = data?.attachments;
      this.form.patchValue({
        ...data.main,
        details: data?.details,
      });

      this.formValues = {
        checklist: data?.details,
      };
      this.form.disable();
    } catch (err) {
      this.isLoading = false;
    }
  };

  getVehiclePhotosByTitles(titles: string[]) {
    if (!Array.isArray(this.attachments)) return [];
    return this.attachments.filter((attachment) => titles.includes(attachment?.title));
  }

  getVehiclePhotosBySide(side: 'front' | 'rear' | 'left' | 'right') {
    return this.getVehiclePhotosByTitles(this.vehiclePhotoTitles[side]);
  }

  getAdditionalVehiclePhotos() {
    if (!Array.isArray(this.attachments)) return [];
    return this.attachments.filter((attachment) =>
      typeof attachment?.title === 'string' && attachment.title.startsWith('Vehicle Additional Photo')
    );
  }

  hasGroupedVehiclePhotos(): boolean {
    const groupedCount =
      this.getVehiclePhotosBySide('front').length +
      this.getVehiclePhotosBySide('rear').length +
      this.getVehiclePhotosBySide('left').length +
      this.getVehiclePhotosBySide('right').length +
      this.getAdditionalVehiclePhotos().length;
    return groupedCount > 0;
  }

  setFormEmitter($event) {
    this.form = $event;
  }

  details;
  setDetailsFormEmitter($event) {
    this.details = $event?.checklist;
  }

  async onSubmit() {
    this.submitted = true;
    this.form.value.details = this.details;

    try {
      this.isLoading = true;
      await this.api._create(this.form.value);

      this.isLoading = false;
      this.toastrService.success("Successfully Created");

      this.router.navigate([NAVIGATION_ROUTE.EDIT]);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  hasFailedInspections(): boolean {
    const checklist = this.formValues?.checklist;
    if (!Array.isArray(checklist)) return false;

    // Consider an item a "failed and requires attention" when:
    // - It was marked failed at inspection time (status === 0)
    // - AND it has not been confirmed resolved (missing resolved_confirmed_date)
    // Once all failed items have a confirmed resolution date, no failure alert should show.
    return checklist.some((section: any) =>
      Array.isArray(section?.details) &&
      section.details.some((item: any) => item?.status === 0 && !item?.resolved_confirmed_date)
    );
  }
}
