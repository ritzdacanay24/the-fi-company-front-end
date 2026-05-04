import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { QirFormComponent } from "../qir-form/qir-form.component";
import { QirService } from "@app/core/api/quality/qir.service";
import { NAVIGATION_ROUTE } from "../qir-constant";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { IQirForm } from "../qir-form/qir-form-type";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { QirResponseModalService } from "../qir-response/qir-repsonse-modal/qir-repsonse-modal.component";
import { QirResponseService } from "@app/core/api/quality/qir-response.service";
import { QirResponseFormComponent } from "../qir-response/qir-response-form/qir-response-form.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule, QirFormComponent, QirResponseFormComponent],
  selector: "app-qir-edit",
  templateUrl: "./qir-edit.component.html",
  styleUrls: ["./qir-edit.component.scss"],
})
export class QirEditComponent {
  private readonly imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "bmp",
    "svg",
    "avif",
  ];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private authenticationService: AuthenticationService,
    private qirResponseModalService: QirResponseModalService,
    private qirResponseService: QirResponseService,
    private modalService: NgbModal
  ) {}

  @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit Quality Incident Report";

  form: MyFormGroup<IQirForm>;

  id = null;

  isLoading = false;
  isDragOver = false;

  submitted = false;

  activeTab: "qir" | "response" = "qir";

  qirResponseForm: any;
  qirResponseSubmitted = false;
  qirResponseId: string | null = null;

  statusOptions = [
    { value: "Open", label: "Open", canEdit: true },
    { value: "In Process", label: "In Process", canEdit: true },
    { value: "Awaiting Verification", label: "Awaiting Verification", canEdit: true },
    { value: "Approved", label: "Approved", canEdit: false },
    { value: "Rejected", label: "Rejected", canEdit: false },
    { value: "Closed", label: "Closed", canEdit: false },
    { value: "N/A", label: "N/A", canEdit: true },
  ];

  async activateQirResponseTab() {
    this.activeTab = "response";
    await this.loadQirResponseData();
  }

  async loadQirResponseData() {
    try {
      const data: any = await this.qirResponseService.findOne({ qir_number: this.id });
      this.qirResponseId = data?.id || null;
      if (this.qirResponseForm) {
        if (!data) {
          this.qirResponseForm.patchValue({
            created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
            qir_number: this.id,
          });
        } else {
          this.qirResponseForm.patchValue(data);
        }
      }
    } catch (err) {
      console.error("Failed to load QIR response data:", err);
    }
  }

  async onQirResponseSubmit() {
    if (this.qirResponseForm?.invalid) {
      this.qirResponseSubmitted = true;
      return;
    }

    try {
      this.isLoading = true;
      if (this.qirResponseId) {
        await this.qirResponseService.update(this.qirResponseId, this.qirResponseForm.value);
      } else {
        const result = await this.qirResponseService.create(this.qirResponseForm.value);
        this.qirResponseId = result?.insertId?.toString() || null;
      }
      this.isLoading = false;
      this.toastrService.success("QIR Response Updated");
      this.qirResponseForm.markAsPristine();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error("Failed to update QIR Response");
    }
  }

  async onQirResponsePrint() {
    if (!this.qirResponseForm) {
      this.toastrService.warning("QIR Response form not loaded");
      return;
    }

    setTimeout(() => {
      const printableArea = document.getElementById("qirResponsePrintableArea");
      if (printableArea) {
        const popupWin = window.open("", "_blank", "width=1000,height=600");
        popupWin.document.open();
        popupWin.document.write(`
          <html>
            <head>
              <title>QIR Response Form</title>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
              <style>
                @media print {
                  body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                  .print-hide { display: none !important; }
                }
              </style>
            </head>
            <body>
              ${printableArea.innerHTML}
            </body>
          </html>
        `);
        popupWin.document.close();
        popupWin.print();
      }
    }, 100);
  }

  setQirResponseFormElements = ($event) => {
    this.qirResponseForm = $event;
    if (this.id) {
      this.loadQirResponseData();
    }
  };

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  get isQirClosed(): boolean {
    const currentStatus = this.statusOptions.find(
      (status) => status.value === this.data?.status
    );
    return currentStatus ? !currentStatus.canEdit : false;
  }

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);

      this.form.get("first_name").disable();
      this.form.get("last_name").disable();
      this.form.get("email").disable();

      if (this.isQirClosed) {
        this.form.disable();
      } else {
        this.form.enable();
        this.form.get("first_name").disable();
        this.form.get("last_name").disable();
        this.form.get("email").disable();
      }

      this.getAttachments();
    } catch (err) {}
  }

  async onSubmit() {
    if (this.form.invalid && this.form.value.active == 1) {
      this.submitted = true;
      getFormValidationErrors();
      return;
    }

    if (this.form.value?.status != "Open") {
      this.form.value.statusClosed = moment().format("YYYY-MM-DD HH:mm:ss");
      this.form.value.completedBy =
        this.authenticationService.currentUserValue.id;
    } else {
      this.form.value.statusClosed = null;
      this.form.value.completedBy = null;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.getRawValue());
      await this.onUploadAttachments();
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.form.markAsPristine();
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  onView() {
    this.router.navigate([NAVIGATION_ROUTE.VIEW], {
      queryParamsHandling: "merge",
      queryParams: { id: this.id },
    });
  }

  onActionMenuClick(
    action: "archive" | "delete" | "qir-response" | "export-pdf"
  ) {
    if (action === "qir-response") {
      this.activateQirResponseTab();
      return;
    }

    if (action === "export-pdf") {
      this.onDownloadAsPdf();
      return;
    }

    if (action === "archive") {
      this.onArchiveQir();
      return;
    }

    if (action === "delete") {
      this.onDeleteQir();
      return;
    }

    this.toastrService.info("This action is not available yet.");
  }

  private async onArchiveQir() {
    if (!this.id) {
      return;
    }

    const confirmed = window.confirm(
      `Archive QIR #${this.id}? Archived records are removed from active lists.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, { active: 0 });
      this.toastrService.success("QIR archived successfully");
      this.goBack();
    } catch (error: any) {
      const message =
        error?.error?.message ||
        error?.message ||
        "Unable to archive QIR";
      this.toastrService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  private async onDeleteQir() {
    if (!this.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete QIR #${this.id}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.delete(this.id);
      this.toastrService.success("QIR deleted successfully");
      this.goBack();
    } catch (error: any) {
      const message =
        error?.error?.message ||
        error?.message ||
        "Unable to delete QIR. You may not have manage permission.";
      this.toastrService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  attachments: any = [];

  get imageAttachments() {
    return this.attachments.filter(
      (row) => row.isImage && row.previewUrl && !row.previewFailed
    );
  }

  async getAttachments() {
    const attachments = await this.attachmentsService.find({
      field: "Capa Request",
      uniqueId: this.id,
    });

    this.attachments = await Promise.all(
      attachments.map(async (attachment) => {
        const isImage = this.isImageAttachment(attachment?.fileName);
        const previewUrl = isImage
          ? await this.resolveAttachmentUrl(attachment, false)
          : null;

        return {
          ...attachment,
          isImage,
          previewUrl,
          previewFailed: !previewUrl && isImage,
        };
      })
    );
  }

  private getLegacyAttachmentUrl(fileName: string): string {
    return `https://dashboard.eye-fi.com/attachments/capa/${encodeURIComponent(fileName)}`;
  }

  private isImageAttachment(fileName?: string): boolean {
    const extension = fileName?.split(".").pop()?.toLowerCase();
    return !!extension && this.imageExtensions.includes(extension);
  }

  private async resolveAttachmentUrl(
    row: any,
    showError = true
  ): Promise<string | null> {
    try {
      const resolved = await this.attachmentsService.getViewById(row?.id);
      return (
        resolved?.url ||
        row?.previewUrl ||
        row?.link ||
        this.getLegacyAttachmentUrl(row?.fileName || "")
      );
    } catch (error) {
      if (showError) {
        console.error("Failed to resolve attachment URL:", error);
        this.toastrService.error("Unable to open attachment");
      }

      return row?.link || null;
    }
  }

  private openFileViewerModal(url: string, fileName: string): void {
    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: "xl",
      centered: true,
      backdrop: true,
      keyboard: true,
    });

    modalRef.componentInstance.url = url;
    modalRef.componentInstance.fileName = fileName;
  }

  async openAttachment(row: any, event?: Event): Promise<void> {
    event?.preventDefault();

    const resolvedUrl = await this.resolveAttachmentUrl(row);

    if (!resolvedUrl) {
      this.toastrService.warning("Attachment URL not available");
      return;
    }

    this.openFileViewerModal(resolvedUrl, row?.fileName || "Attachment");
  }

  async downloadAttachment(row: any, event?: Event): Promise<void> {
    event?.preventDefault();

    const resolvedUrl = await this.resolveAttachmentUrl(row);

    if (!resolvedUrl) {
      this.toastrService.warning("Attachment URL not available");
      return;
    }

    window.open(resolvedUrl, "_blank");
  }

  onPreviewError(row: any) {
    row.previewFailed = true;
  }

  async deleteAttachment(id, index) {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  file: File = null;
  myFiles: File[] = [];
  selectedFiles: File[] = [];

  openFilePicker() {
    if (this.isQirClosed) return;
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
    if (this.isQirClosed) return;
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
    if (this.isQirClosed) return;

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

  async onUploadAttachments() {
    if (this.myFiles.length === 0) {
      return;
    }

    this.isLoading = true;
    for (const file of this.myFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", "Capa Request");
      formData.append("uniqueData", `${this.id}`);
      formData.append("folderName", "capa");
      try {
        await this.attachmentsService.uploadfile(formData);
      } catch (err) {}
    }

    this.resetFileInput();

    this.isLoading = false;
    try {
      this.getAttachments();
      this.myFiles = [];
      this.selectedFiles = [];
    } catch (err) {}
  }

  qirResponse;
  async onDownloadAsPdf() {
    if (this.form.dirty) {
      alert("Please save before downloading as PDF");
      return;
    }

    this.qirResponse = await this.qirResponseService.findOne({
      qir_number: this.id,
    });

    setTimeout(function () {
      var printContents = document.getElementById("content").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();
      popupWin.document.write(`
      <html>
        <head>
          <title>Work Order Info</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

          <style>
            @page {
              size: portrait;
            }
            @media print {
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
            }
              .bg-grey {
                background-color: lightgrey !important;
              }
              .pagebreak { page-break-before: always; }

              .table  td {
                font-size:11px
              }

              td:empty::after {
                content: ".";
                visibility:hidden;
              }

              .print-pre {
                white-space: pre-wrap;
                word-break: break-word;
                font-family: inherit;
                margin: 0;
                padding: 4px;
              }
              .wrap-text {
                word-wrap: break-word;
                word-break: break-word;
                white-space: pre-wrap;
                max-width: 0;
              }
            }

          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>
      </html>`);
      popupWin.document.close();
      popupWin.onload = function () {
        popupWin.print();
        popupWin.close();
      };
    }, 0);
  }
}
