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
import { UploadService } from "@app/core/api/upload/upload.service";
import { firstValueFrom } from "rxjs";
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule, SafetyIncidentFormComponent, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
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
    private uploadService: UploadService,
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

  private openFileViewerModal(url: string, fileName: string): void {
    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: true,
      keyboard: true,
    });

    modalRef.componentInstance.url = url;
    modalRef.componentInstance.fileName = fileName;
  }

  async openAttachment(attachment: any): Promise<void> {
    try {
      const resolved = await this.attachmentsService.getViewById(attachment?.id);
      const resolvedUrl = resolved?.url || attachment?.link;
      if (!resolvedUrl) {
        this.toastrService.warning('Attachment URL not available');
        return;
      }

      this.openFileViewerModal(resolvedUrl, attachment?.fileName || resolved?.fileName || 'Attachment');
    } catch (error) {
      console.error('Failed to resolve attachment URL:', error);
      this.toastrService.error('Unable to open attachment');
    }
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
        formData.append("subFolder", FILE.FOLDER);
        
        try {
          await firstValueFrom(this.uploadService.uploadAttachmentV2(formData));
          totalAttachments++;
        } catch (err) {
          failedAttachments++;
          console.error('Failed to upload file:', this.myFiles[i].name, err);
        }
      }
      
      // Clear the file selection and reset input
      this.myFiles = [];
      this.clearSelectedImagePreviews();
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

  async onArchive() {
    if (!confirm(`Archive Safety Incident #${this.id}? It will be hidden from the active list but remain on record.`)) return;
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
    if (!confirm(`Are you sure you want to delete Safety Incident #${this.id}? This action cannot be undone.`)) return;
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

  onCancel() {
    this.goBack();
  }

  attachments: any = [];
  selectedImagePreviews: Array<{ name: string; url: string }> = [];
  private readonly imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"];

  private isImageAttachment(fileName: string): boolean {
    if (!fileName) return false;
    const extension = fileName.split(".").pop()?.toLowerCase();
    return !!extension && this.imageExtensions.includes(extension);
  }

  get imageAttachments() {
    return this.attachments.filter((row) => row?.isImage && row?.previewUrl && !row?.previewFailed);
  }

  onPreviewError(attachment: any) {
    attachment.previewFailed = true;
  }

  private clearSelectedImagePreviews() {
    for (const row of this.selectedImagePreviews) {
      URL.revokeObjectURL(row.url);
    }
    this.selectedImagePreviews = [];
  }

  private async resolveAttachmentPreviewUrl(attachment: any): Promise<string | null> {
    try {
      const resolved = await this.attachmentsService.getViewById(attachment?.id);
      return resolved?.url || attachment?.link || null;
    } catch {
      return attachment?.link || null;
    }
  }

  async getAttachments() {
    const rows = await this.attachmentsService.find({
      field: FILE.FIELD,
      uniqueId: this.id,
    });

    this.attachments = await Promise.all(
      (rows || []).map(async (row) => {
        const isImage = this.isImageAttachment(row?.fileName);
        const previewUrl = isImage ? await this.resolveAttachmentPreviewUrl(row) : null;
        return {
          ...row,
          isImage,
          previewUrl,
          previewFailed: false,
        };
      })
    );
  }

  async deleteAttachment(id, index) {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  file: File = null;

  myFiles: File[] = [];

  onFileChange(event: any) {
    this.clearSelectedImagePreviews();
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      const file = event.target.files[i] as File;
      this.myFiles.push(file);
      if (this.isImageAttachment(file?.name)) {
        this.selectedImagePreviews.push({
          name: file.name,
          url: URL.createObjectURL(file),
        });
      }
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
