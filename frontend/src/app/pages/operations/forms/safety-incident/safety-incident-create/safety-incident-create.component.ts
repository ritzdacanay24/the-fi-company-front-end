import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { SafetyIncidentFormComponent } from "../safety-incident-form/safety-incident-form.component";
import { FILE, NAVIGATION_ROUTE } from "../safety-incident-constant";
import { SafetyIncidentService } from "@app/core/api/operations/safety-incident/safety-incident.service";
import { UploadService } from "@app/core/api/upload/upload.service";
import { firstValueFrom } from "rxjs";

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
    private uploadService: UploadService
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

      for (var i = 0; i < this.myFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", this.myFiles[i]);
        formData.append("field", FILE.FIELD);
        formData.append("uniqueData", insertId.toString());
        formData.append("folderName", FILE.FOLDER);
        formData.append("subFolder", FILE.FOLDER);

        await firstValueFrom(this.uploadService.uploadAttachmentV2(formData));
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
    this.clearImagePreviews();
    this.myInputVariable.nativeElement.value = "";
  }

  onCancel() {
    this.goBack();
  }

  myFiles: string[] | any = [];
  imagePreviews: Array<{ name: string; url: string }> = [];

  private isImageFile(file: File): boolean {
    if (!file?.name) return false;
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"];
    const extension = file.name.split(".").pop()?.toLowerCase();
    return !!extension && imageExtensions.includes(extension);
  }

  private clearImagePreviews() {
    for (const row of this.imagePreviews) {
      URL.revokeObjectURL(row.url);
    }
    this.imagePreviews = [];
  }

  onFileChange(event: any) {
    this.clearImagePreviews();
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      const file = event.target.files[i] as File;
      this.myFiles.push(file);
      if (this.isImageFile(file)) {
        this.imagePreviews.push({
          name: file.name,
          url: URL.createObjectURL(file),
        });
      }
    }
  }

  @ViewChild("myInput")
  myInputVariable: ElementRef;
}
