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
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { UploadedAttachmentsListComponent } from "@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";
import { UploadTriggerMode } from "@app/shared/components/attachments/attachment-upload.types";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    SafetyIncidentFormComponent,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    UploadedAttachmentsListComponent,
    UploadNewAttachmentsComponent,
  ],
  selector: "app-safety-incident-edit",
  templateUrl: "./safety-incident-edit.component.html",
})
export class SafetyIncidentEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: SafetyIncidentService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private modalService: NgbModal
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

  get isClosed(): boolean {
    return this.data?.status === 'Closed';
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

      // Lock all fields if closed
      if (this.isClosed) {
        this.form.disable();
      }
      
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



  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      
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

  async onArchive() {
    const result = await SweetAlert.confirm({
      title: "Archive Safety Incident?",
      text: "Archived records are removed from active lists but remain on record.",
      icon: "warning",
      confirmButtonText: "Yes, archive",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      this.isLoading = true;
      await this.api.archive(this.id);
      this.toastrService.success('Safety incident archived successfully');
      this.form.markAsPristine();
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error('Failed to archive safety incident');
    }
  }

  async onDelete() {
    const result = await SweetAlert.confirm({
      title: "Delete Safety Incident?",
      text: "This action cannot be undone.",
      icon: "warning",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      this.isLoading = true;
      await this.api.delete(this.id);
      this.toastrService.success('Safety incident deleted successfully');
      this.form.markAsPristine();
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error('Failed to delete safety incident');
    }
  }

  async onReopen() {
    const result = await SweetAlert.confirm({
      title: "Reopen Safety Incident?",
      text: "This will set the status back to Open and allow editing.",
      icon: "question",
      confirmButtonText: "Yes, reopen",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      this.isLoading = true;
      await this.api.reopen(this.id);
      this.toastrService.success('Safety incident reopened successfully');
      await this.getData();
    } catch (err: any) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  attachments: any = [];
  attachmentsLoading = false;
  uploadTriggerMode: UploadTriggerMode = "on-add";
  myFiles: File[] = [];

  async getAttachments() {
    this.attachmentsLoading = true;
    try {
      const rows = await this.attachmentsService.find({
        field: FILE.FIELD,
        uniqueId: this.id,
      });

      this.attachments = rows || [];
    } finally {
      this.attachmentsLoading = false;
    }
  }

  async deleteAttachment(id, index) {
    const result = await SweetAlert.confirm({
      title: "Remove attachment?",
      text: "This will permanently remove the attachment from this safety incident.",
      icon: "warning",
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.myFiles = [...this.myFiles, ...files];
  }

  removeFile(index: number) {
    this.myFiles.splice(index, 1);
  }

  async onUploadAttachments() {
    if (this.myFiles && this.myFiles.length > 0) {
      let totalAttachments = 0;
      let failedAttachments = 0;
      
      for (let i = 0; i < this.myFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", this.myFiles[i]);
        formData.append("field", FILE.FIELD);
        formData.append("uniqueData", `${this.id}`);
        formData.append("subFolder", FILE.FOLDER);
        
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++;
        } catch (err) {
          failedAttachments++;
          console.error('Failed to upload file:', this.myFiles[i].name, err);
        }
      }
      
      // Clear the pending list after upload
      this.myFiles = [];
      
      // Refresh attachments list
      await this.getAttachments();
      
      // Show upload results if any failed
      if (failedAttachments > 0) {
        this.toastrService.warning(`${totalAttachments} file(s) uploaded, ${failedAttachments} failed`);
      }
    }
  }
}
