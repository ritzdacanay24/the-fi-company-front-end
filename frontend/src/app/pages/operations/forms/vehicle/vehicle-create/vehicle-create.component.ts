import { Component, HostListener, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { VehicleFormComponent } from "../vehicle-form/vehicle-form.component";
import { NAVIGATION_ROUTE } from "../vehicle-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IVehicleForm } from "../vehicle-form/vehicle-form.type";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent],
  selector: "app-vehicle-create",
  templateUrl: "./vehicle-create.component.html",
})
export class VehicleCreateComponent {
  readonly FeatureType = FeatureType;

  constructor(
    private router: Router,
    private api: VehicleService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
  }

  ngOnInit(): void {}

  title = "Create Vehicle";

  form: MyFormGroup<IVehicleForm>;

  id = null;

  isLoading = false;

  submitted = false;

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
        createdBy: this.authenticationService.currentUserValue.id,
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
    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      if (this.myFiles.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          FeatureType.VEHICLE_MANAGEMENT,
          insertId,
          this.myFiles,
        );
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.selectedFiles = [];
      this.myFiles = [];
      this.form.markAsPristine();
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  myFiles: File[] = [];
  selectedFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files || []);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.myFiles = [...this.selectedFiles];
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const dedupedFiles = new Map(
      this.selectedFiles.map((file) => [this.getFileKey(file), file])
    );

    files.forEach((file) => {
      dedupedFiles.set(this.getFileKey(file), file);
    });

    this.selectedFiles = Array.from(dedupedFiles.values());
    this.myFiles = [...this.selectedFiles];
  }

  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
