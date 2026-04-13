import { Component, HostListener, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { QirFormComponent } from "../qir-form/qir-form.component";
import { NAVIGATION_ROUTE } from "../qir-constant";
import { QirService } from "@app/core/api/quality/qir.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [SharedModule, QirFormComponent],
  selector: "app-qir-create",
  templateUrl: "./qir-create.component.html",
  styleUrls: ["./qir-create.component.scss"],
})
export class QirCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirService,
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

  title = "Create Quality Incident Report";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
  }

  data: any;

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        createdBy: this.authenticationService.currentUserValue.id,
        first_name: this.authenticationService.currentUserValue.first_name,
        last_name: this.authenticationService.currentUserValue.last_name,
        email: this.authenticationService.currentUserValue.email,
      },
      { emitEvent: false }
    );

    this.form.get("first_name").disable();
    this.form.get("last_name").disable();
    this.form.get("email").disable();
  }

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
    } catch (err) {}
  }

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
      },
      { emitEvent: false }
    );

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.getRawValue());

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", "Capa Request");
          formData.append("uniqueData", `${insertId}`);
          formData.append("folderName", "capa");
          await this.attachmentsService.uploadfile(formData);
        }
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.form.markAsPristine();
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  file: File = null;

  myFiles: string[] = [];
  selectedFiles: File[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    this.selectedFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
      this.selectedFiles.push(event.target.files[i]);
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.myFiles.splice(index, 1);
  }

  getTotalFileSize(): string {
    if (!this.selectedFiles || this.selectedFiles.length === 0) {
      return "0";
    }
    const totalBytes = this.selectedFiles.reduce(
      (total, file) => total + file.size,
      0
    );
    return (totalBytes / 1024 / 1024).toFixed(2);
  }

  getFormProgress(): number {
    if (!this.form) return 0;

    // Get all form controls that have required validators
    const requiredFields = Object.keys(this.form.controls).filter((fieldName) => {
      const control = this.form.get(fieldName);
      if (!control || !control.validator) return false;
      
      // Test the validator with a null value to see if it has required validation
      const validationResult = control.validator({ value: null } as any);
      return validationResult && validationResult['required'];
    });

    if (requiredFields.length === 0) {
      // If no required fields found, form is essentially complete
      return 100;
    }

    const completedRequiredFields = requiredFields.filter((field) => {
      const control = this.form.get(field);
      return (
        control &&
        control.valid &&
        control.value &&
        control.value.toString().trim() !== ""
      );
    });

    // Progress is purely based on required fields (0-100%)
    return Math.round((completedRequiredFields.length / requiredFields.length) * 100);
  }

  getRequiredFieldsStatus(): string {
    if (!this.form) return "Loading form...";

    const progress = this.getFormProgress();
    const remainingRequired = Object.keys(this.form.controls).filter((fieldName) => {
      const control = this.form.get(fieldName);
      if (!control || !control.validator) return false;
      
      const validationResult = control.validator({ value: null } as any);
      const hasRequiredValidator = validationResult && validationResult['required'];
      
      return hasRequiredValidator && control.invalid;
    }).length;

    if (progress === 100) {
      return "All required fields completed! Ready to submit.";
    } else if (progress >= 75) {
      return `Almost there! ${remainingRequired} required field(s) remaining.`;
    } else if (progress >= 50) {
      return `Good progress! ${remainingRequired} required field(s) remaining.`;
    } else {
      return `${remainingRequired} required field(s) need to be completed.`;
    }
  }
}
