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

  title = "Create QIR";

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
      let { insertId } = await this.api.create(this.form.value);

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

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }
}
