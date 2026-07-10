import {
  Component,
  HostListener,
  Input,
} from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { SafetyIncidentFormComponent } from "../safety-incident-form/safety-incident-form.component";
import { NAVIGATION_ROUTE } from "../safety-incident-constant";
import { SafetyIncidentService } from "@app/core/api/operations/safety-incident/safety-incident.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [SharedModule, SafetyIncidentFormComponent],
  selector: "app-safety-incident-create",
  templateUrl: "./safety-incident-create.component.html",
})
export class SafetyIncidentCreateComponent {
  constructor(
    private router: Router,
    private api: SafetyIncidentService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  printFormLanguage = "en";
  printFormOptions = [
    { name: "Spanish", value: "es" },
    { name: "English", value: "en" },
  ];

  ngOnInit(): void {}

  title = "Create Safety Incident";

  form: MyFormGroup<any>;

  id = null;

  isLoading = false;

  submitted = false;

  readonly attachmentFeature = FeatureType.SAFETY_INCIDENT;

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
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
  }

  onPrint;

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
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

      if (this.pendingAttachmentFiles.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          this.attachmentFeature,
          insertId,
          this.pendingAttachmentFiles,
        );
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.clear();

      // this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      //   queryParamsHandling: "merge",
      //   queryParams: { id: insertId },
      // });
    } catch (err) {
      this.isLoading = false;
    }
  }

  clear() {
    this.form.markAsPristine();
    this.form.reset(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
    this.pendingAttachmentFiles = [];
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
