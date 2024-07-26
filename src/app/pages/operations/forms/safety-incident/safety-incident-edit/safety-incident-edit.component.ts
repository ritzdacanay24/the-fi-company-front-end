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

  title = "Edit";

  form: MyFormGroup<any>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

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
      await this.getAttachments();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  viewImage(row) {
    console.log(row);
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
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
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

  myFiles: string[] = [];

  onFileChange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", FILE.FIELD);
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", FILE.FOLDER);
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++;
        } catch (err) {}
      }
      this.isLoading = false;
      await this.getAttachments();
    }
  }
}
