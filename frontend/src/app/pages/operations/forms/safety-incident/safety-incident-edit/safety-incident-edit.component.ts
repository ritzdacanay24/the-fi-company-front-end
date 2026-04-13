import { Component, HostListener, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { SafetyIncidentService } from "@app/core/api/operations/safety-incident/safety-incident.service";
import { SafetyIncidentFormComponent } from "../safety-incident-form/safety-incident-form.component";
import { FILE, NAVIGATION_ROUTE } from "../safety-incident-constant";

@Component({
  standalone: true,
  imports: [SharedModule, SafetyIncidentFormComponent],
  selector: "app-safety-incident-edit",
  templateUrl: "./safety-incident-edit.component.html",
})
export class SafetyIncidentEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: SafetyIncidentService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService
  ) {}

  setFormEmitter($event) {
    this.form = $event;
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit Safety Incident";

  form: MyFormGroup<any>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  get isFormDisabled() {
    return this.form?.disabled || false;
  }

  data: any;

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
  }

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      
      // Lock critical fields to maintain data integrity and compliance
      this.lockCriticalFields();
      
      await this.getAttachments();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  /**
   * Lock critical safety incident fields to maintain regulatory compliance
   * and data integrity. Only administrative fields remain editable.
   */
  private lockCriticalFields() {
    // Core incident data - must remain unchanged for legal/regulatory compliance
    this.form.get("first_name")?.disable();
    this.form.get("last_name")?.disable();
    this.form.get("date_of_incident")?.disable();
    this.form.get("time_of_incident")?.disable();
    this.form.get("type_of_incident")?.disable();
    this.form.get("type_of_incident_other")?.disable();
    this.form.get("location_of_incident")?.disable();
    this.form.get("location_of_incident_other")?.disable();
    this.form.get("location_of_incident_other_other")?.disable();
    this.form.get("description_of_incident")?.disable();
    this.form.get("details_of_any_damage_or_personal_injury")?.disable();
    
    // Administrative fields remain editable:
    // - status (investigation status can be updated)
    // - corrective_action_owner (can be reassigned)
    // - proposed_corrective_action (can be updated during investigation)
    // - proposed_corrective_action_completion_date (can be adjusted)
    // - confirmed_corrective_action_completion_date (updated when completed)
    // - comments (administrative notes can be added)
  }

  viewImage(row) {
    window.open(row.directory + "/safetyIncident/" + row.fileName, "_blank");
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      
      // Upload any pending attachments first
      if (this.myFiles && this.myFiles.length > 0) {
        await this.uploadPendingAttachments();
      }
      
      // Get form data including disabled fields for submission
      const formData = this.form.getRawValue();
      
      await this.api.update(this.id, formData);
      this.isLoading = false;
      this.toastrService.success("Safety incident updated successfully");
      this.form.markAsPristine()
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  /**
   * Upload attachments that are selected but not yet uploaded
   */
  private async uploadPendingAttachments() {
    if (this.myFiles && this.myFiles.length > 0) {
      let totalAttachments = 0;
      let failedAttachments = 0;
      
      for (let i = 0; i < this.myFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", this.myFiles[i]);
        formData.append("field", FILE.FIELD);
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", FILE.FOLDER);
        
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++;
        } catch (err) {
          failedAttachments++;
          console.error('Failed to upload file:', this.myFiles[i].name, err);
        }
      }
      
      // Clear the file selection and reset input
      this.myFiles = [];
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refresh attachments list
      await this.getAttachments();
      
      // Show upload results
      if (failedAttachments > 0) {
        this.toastrService.warning(`${totalAttachments} file(s) uploaded, ${failedAttachments} failed`);
      }
    }
  }

  onCancel() {
    this.goBack();
  }

  attachments: any = [];
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({
      field: FILE.FIELD,
      uniqueId: this.id,
    });
  }

  async deleteAttachment(id, index) {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  file: File = null;

  myFiles: File[] = [];

  onFileChange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles && this.myFiles.length > 0) {
      this.isLoading = true;
      const fileCount = this.myFiles.length;
      
      try {
        await this.uploadPendingAttachments();
        this.toastrService.success(`${fileCount} file(s) uploaded successfully`);
      } catch (err) {
        this.toastrService.error('Failed to upload some files');
      } finally {
        this.isLoading = false;
      }
    }
  }
}
