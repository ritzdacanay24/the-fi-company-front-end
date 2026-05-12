import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  OnInit,
} from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { SafetyIncidentFormPublicComponent } from "./safety-incident-form-public.component";
import { SafetyIncidentService } from "@app/core/api/operations/safety-incident/safety-incident.service";
import { UploadService } from "@app/core/api/upload/upload.service";
import { firstValueFrom } from "rxjs";

const FILE = {
  FIELD: "attachment",
  FOLDER: "safety_incident",
};

@Component({
  standalone: true,
  imports: [SharedModule, SafetyIncidentFormPublicComponent],
  selector: "app-safety-incident-create-public",
  templateUrl: "./safety-incident-create-public.component.html",
})
export class SafetyIncidentCreatePublicComponent implements OnInit {
  constructor(
    private router: Router,
    private api: SafetyIncidentService,
    private toastrService: ToastrService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {}

  title = "Report a Safety Incident";

  form: MyFormGroup<any>;

  id = null;

  isLoading = false;

  submitted = false;

  myFiles: File[] = [];

  @Input() goBack: Function = () => {
    this.router.navigate(['/forms']);
  };

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        // No created_by for public submissions
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

  onFileChange(event: any): void {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
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
      let { insertId } = await this.api.createPublic(this.form.value);

      // Upload attachments if any
      for (var i = 0; i < this.myFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", this.myFiles[i]);
        formData.append("field", FILE.FIELD);
        formData.append("uniqueData", insertId.toString());
        formData.append("folderName", FILE.FOLDER);
        formData.append("subFolder", FILE.FOLDER);

        await firstValueFrom(this.uploadService.uploadAttachmentV2(formData));
      }

      this.toastrService.success(
        "Safety incident report submitted successfully. Thank you for helping keep our workplace safe.",
        "Success"
      );

      // Redirect after success
      setTimeout(() => {
        this.router.navigate(['/forms']);
      }, 2000);
    } catch (error) {
      console.error("Error submitting safety incident:", error);
      this.toastrService.error(
        "Error submitting the safety incident report. Please try again.",
        "Error"
      );
    } finally {
      this.isLoading = false;
    }
  }
}
