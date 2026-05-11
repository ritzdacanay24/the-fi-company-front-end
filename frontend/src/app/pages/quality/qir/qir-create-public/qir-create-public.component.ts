import { Component, ElementRef, HostListener, Input, ViewChild } from "@angular/core";
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

  @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

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
  isDragOver = false;

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
          const formData = new FormData();
          formData.append("file", file);
          formData.append("uniqueData", `${res.insertId}`);
          formData.append("uniqueId", `${res.insertId}`);
          try {
            await this.api.uploadAttachmentPublic(formData);
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

  file: File = null;
  myFiles: File[] = [];
  selectedFiles: File[] = [];

  openFilePicker() {
    if (this.form?.disabled) return;
    this.fileInput?.nativeElement.click();
  }

  onFilechange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.addFiles(files);
    this.resetFileInput();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.form?.disabled) return;
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.form?.disabled) return;

    this.isDragOver = false;
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    this.addFiles(files);
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.myFiles = [...this.selectedFiles];
    this.resetFileInput();
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

  private resetFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }

  attachments: any = [];
  async getAttachments() {
    this.attachments = await this.attachmentsService.getAttachmentByQirId(
      this.id
    );
  }
}
