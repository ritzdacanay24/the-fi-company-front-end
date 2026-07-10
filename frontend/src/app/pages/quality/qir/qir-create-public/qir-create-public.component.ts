import { Component, HostListener, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../qir-constant";
import { QirService } from "@app/core/api/quality/qir.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { QirPublicFormComponent } from "../qir-public-form/qir-public-form.component";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { LocationStrategy } from "@angular/common";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SupportEntryService } from "@app/core/services/support-entry.service";

@Component({
  standalone: true,
  imports: [SharedModule, QirPublicFormComponent],
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
    private location: LocationStrategy,
    private authService: AuthenticationService,
    private supportEntryService: SupportEntryService,
  ) {
    history.pushState(null, null, window.location.href);
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

  isAuthenticated = false;

  goToInternalForm(): void {
    this.router.navigate([NAVIGATION_ROUTE.CREATE]);
  }

  openSupportTicket(): void {
    void this.supportEntryService.openSupport({ source: 'qir-public' });
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.isAuthenticated = true;
      return;
    }

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
      let res: any = await this.api.createQirPublic(this.form.value);

      if (this.myFiles.length > 0) {
        for (const file of this.myFiles) {
          try {
            await this.attachmentsService.uploadQirAttachmentPublic(res.insertId, file);
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

      if (value.isConfirmed) {
        this.onCreateNew();
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

  myFiles: File[] = [];
  selectedFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files || []);
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.myFiles = [...this.selectedFiles];
  }

  private addFiles(files: File[]) {
    if (!files.length) return;

    const dedupedFiles = new Map(
      this.selectedFiles.map((file) => [this.getFileKey(file), file])
    );

    files.forEach((file) => {
      dedupedFiles.set(this.getFileKey(file), file);
    });

    this.selectedFiles = Array.from(dedupedFiles.values());
    this.myFiles = [...this.selectedFiles];
  }

  private getFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  attachments: any = [];
  async getAttachments() {
    this.attachments = await this.attachmentsService.getAttachmentByQirId(
      this.id
    );
  }
}
