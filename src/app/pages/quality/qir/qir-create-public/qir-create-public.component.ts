import { Component, HostListener, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { QirFormComponent } from "../qir-form/qir-form.component";
import { NAVIGATION_ROUTE } from "../qir-constant";
import { QirService } from "@app/core/api/quality/qir.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { QirPublicFormComponent } from "../qir-public-form/qir-public-form.component";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { LocationStrategy } from "@angular/common";

@Component({
  standalone: true,
  imports: [SharedModule, QirFormComponent, QirPublicFormComponent],
  selector: "app-qir-create-public",
  templateUrl: "./qir-create-public.component.html",
  styleUrls: ["./qir-create-public.component.scss"],
})
export class QirCreatePublicComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirService,
    private attachmentsService: AttachmentsService,
    private location: LocationStrategy
  ) {
    history.pushState(null, null, window.location.href);
    // check if back or forward button is pressed.
    this.location.onPopState(() => {
      history.pushState(null, null, window.location.href);
    });
  }

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.fsId = params["fsId"];
    });

    if (this.id) this.getData();
  }

  title = "Quality Incident Report";

  form: FormGroup;

  id = null;
  fsId = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  onCreateNew() {
    this.form.markAsPristine();
    window.location.reload();
  }

  data: any;

  setFormEmitter($event) {
    this.form = $event;

    if (this.fsId) {
      this.form.patchValue({
        fieldServiceSchedulerId: this.fsId,
      });
    }
  }

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      await this.getAttachments();
      this.form.disable();
    } catch (err) {}
  }

  closeWindow = false;
  async onSubmit() {
    this.submitted = true;

    this.form.patchValue(
      {
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
      },
      { emitEvent: false }
    );

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      SweetAlert.loading("Saving. Please wait.");
      this.isLoading = true;
      let res: any = await this.api.createQir(this.form.value);

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", "Capa Request");
          formData.append("uniqueData", `${res.insertId}`);
          formData.append("folderName", "capa");
          try {
            await this.attachmentsService.uploadfilePublic(formData);
          } catch (err) {}
        }
      }

      let value = await SweetAlert.fire({
        icon: "success",
        title: `QIR Request submitted successfully. Your QIR # is ${res.insertId}. `,
        text: "We have received your request.  You will receive a response from our Quality Team within two business days.",
        confirmButtonText: "Create New QIR",
        cancelButtonText: `Close`,
        denyButtonText: `Close`,
        showCancelButton: true,
      });

      //user does not want to create new qir
      if (value.isConfirmed) {
        this.onCreateNew();
        //create new qir
      } else if (value.isDismissed) {
        this.closeWindow = true;
        this.form.disable();
      }
    } catch (err) {
      this.submitted = false;
      SweetAlert.close();
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

  attachments: any = [];
  async getAttachments() {
    this.attachments = await this.attachmentsService.getAttachmentByQirId(
      this.id
    );
  }
}
