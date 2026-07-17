import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { FormGroup } from "@angular/forms";
import { NAVIGATION_ROUTE } from "../forklift-inspection-constant";
import { ForkliftInspectionService } from "@app/core/api/operations/forklift-inspection/forklift-inspection.service";
import { ForkliftInspectionFormComponent } from "../forklift-inspection-form/forklift-inspection-form.component";
import { AuthenticationService } from "@app/core/services/auth.service";
import { resetVehicleInspectionFormValues } from "../forklift-inspection-form/formData";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FeatureType } from "@app/shared/enums/feature.enum";
import { ForkliftService } from "@app/core/api/operations/forklift/forklift.service";

@Component({
  standalone: true,
  imports: [SharedModule, ForkliftInspectionFormComponent],
  selector: "app-forklift-inspection-create",
  templateUrl: "./forklift-inspection-create.component.html",
})
export class ForkliftInspectionCreateComponent {
  constructor(
    private router: Router,
    private api: ForkliftInspectionService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService,
    private forkliftService: ForkliftService,
  ) {}

  ngOnInit(): void {
    this.loadForkliftModelGroups();
  }

  title = "Create Forklift Inspection";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  readonly attachmentFeature = FeatureType.INSPECTIONS_FORKLIFT;
  forkliftModelGroups: Array<{ name: string; details: Array<{ name: string }> }> = [];

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  setFormEmitter($event) {
    this.form = $event;

    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        date_created: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
        created_by_name: this.authenticationService.currentUserValue.full_name,
        operator: this.authenticationService.currentUserValue.full_name,
      },
      { emitEvent: false }
    );
  }

  details;
  setDetailsFormEmitter($event) {
    // The form emits different payload shapes during interactions.
    // Keep the initialized checklist reference and ignore row-level emits.
    if (!Array.isArray($event?.checklist)) {
      return;
    }

    $event.checklist.sort();
    this.details = $event.checklist;
  }

  archiveItem(): void {
    this.toastrService.info("Create the inspection first before archiving.");
  }

  deleteItem(): void {
    this.toastrService.info("Create the inspection first before deleting.");
  }

  pendingAttachmentFiles: File[] = [];

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

  private async loadForkliftModelGroups(): Promise<void> {
    try {
      const groups = await this.forkliftService.getInspectionOptions();
      this.forkliftModelGroups = Array.isArray(groups) ? groups : [];
    } catch {
      this.forkliftModelGroups = [];
    }
  }

  async onSubmit() {
    this.submitted = true;
    const payload = this.form.getRawValue();
    payload.details = this.details;

    try {
      this.isLoading = true;
      let { insertId } = await this.api._create(payload);
      const inspectionId = Number(insertId);

      for (const file of this.pendingAttachmentFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await this.attachmentsService.uploadAttachment(this.attachmentFeature, inspectionId, formData);
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");

      this.pendingAttachmentFiles = [];

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
