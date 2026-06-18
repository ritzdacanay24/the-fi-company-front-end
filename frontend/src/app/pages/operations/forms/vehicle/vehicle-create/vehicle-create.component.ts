import { Component, HostListener, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { VehicleFormComponent } from "../vehicle-form/vehicle-form.component";
import { NAVIGATION_ROUTE, VEHICLE_ATTACHMENT } from "../vehicle-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IVehicleForm } from "../vehicle-form/vehicle-form.type";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent, UploadNewAttachmentsComponent],
  selector: "app-vehicle-create",
  templateUrl: "./vehicle-create.component.html",
})
export class VehicleCreateComponent {
  private allowNavigationAfterSave = false;

  constructor(
    private router: Router,
    private api: VehicleService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.allowNavigationAfterSave) {
      return true;
    }

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

  uploadTriggerMode: "manual" | "on-add" | "parent-submit" = "parent-submit";

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

      if (this.myFiles) {
        for (var i = 0; i < this.myFiles.length; i++) {
          const formData = new FormData();
          formData.append("file", this.myFiles[i]);
          formData.append("field", VEHICLE_ATTACHMENT.FIELD);
          formData.append("uniqueData", `${insertId}`);
          formData.append("subFolder", VEHICLE_ATTACHMENT.SUB_FOLDER);
          await this.attachmentsService.uploadfile(formData);
        }
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.allowNavigationAfterSave = true;
      this.form?.markAsPristine();
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  file: File = null;

  myFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.myFiles = [...this.myFiles, ...files];
  }

  removeFile(index: number) {
    this.myFiles.splice(index, 1);
  }
}
