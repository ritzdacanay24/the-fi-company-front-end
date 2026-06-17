import { Component, Input, ViewChild } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { RmaFormComponent } from "../rma-form/rma-form.component";
import { NAVIGATION_ROUTE } from "../rma-constant";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { RmaService } from "@app/core/api/quality/rma.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { UploadAttachmentsModalComponent } from "@app/shared/components/attachments/upload-attachments-modal/upload-attachments-modal.component";
import { PendingUploadsListComponent } from "@app/shared/components/attachments/pending-uploads-list/pending-uploads-list.component";

@Component({
  standalone: true,
  imports: [SharedModule, RmaFormComponent, UploadAttachmentsModalComponent, PendingUploadsListComponent],
  selector: "app-rma-create",
  templateUrl: "./rma-create.component.html",
  styleUrls: ["./rma-create.component.scss"],
})
export class RmaCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RmaService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  @ViewChild(UploadAttachmentsModalComponent) uploadModal: UploadAttachmentsModalComponent | null = null;

  title = "Create RMA";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;
  selectedFiles: File[] = [];
  uploadTriggerMode: "manual" | "on-add" | "parent-submit" = "parent-submit";

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
    } catch (err) {}
  }

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
      const result = await this.api.create(this.form.value);

      if (result?.insertId && this.selectedFiles.length > 0) {
        await this.uploadAttachments(result.insertId);
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  private async uploadAttachments(insertId: number): Promise<void> {
    for (const file of this.selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", "RMA");
      formData.append("uniqueData", `${insertId}`);
      formData.append("subFolder", "quality/rma");

      try {
        await this.attachmentsService.uploadfile(formData);
      } catch (err) {}
    }

    this.selectedFiles = [];
  }
}
