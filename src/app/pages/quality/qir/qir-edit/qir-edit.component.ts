import {
  ChangeDetectionStrategy,
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
import { Lightbox } from "ngx-lightbox";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { QirResponseModalService } from "../qir-response/qir-repsonse-modal/qir-repsonse-modal.component";
import { QirResponseService } from "@app/core/api/quality/qir-response.service";

@Component({
  standalone: true,
  imports: [SharedModule, QirFormComponent],
  selector: "app-qir-edit",
  templateUrl: "./qir-edit.component.html",
  styleUrls: ["./qir-edit.component.scss"]
})
export class QirEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private lightbox: Lightbox,
    private authenticationService: AuthenticationService,
    private qirResponseModalService: QirResponseModalService,
    private qirResponseService: QirResponseService
  ) { }

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

  submitted = false;

  async openQirResponse() {
    const modalRef = this.qirResponseModalService.open(this.id);
    modalRef.result.then(async (result: any) => { });
  }

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

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);

      this.form.get("first_name").disable();
      this.form.get("last_name").disable();
      this.form.get("email").disable();

      this.getAttachments();
    } catch (err) { }
  }

  async onSubmit() {
    if (this.form.invalid && this.form.value.active == 1) {
      this.submitted = true;
      getFormValidationErrors();
      return;
    } else {
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
      await this.onUploadAttachments()
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

  images;
  attachments: any = [];
  async getAttachments() {
    this.images = [];
    this.attachments = await this.attachmentsService.find({
      field: "Capa Request",
      uniqueId: this.id,
    });

    for (let i = 0; i < this.attachments.length; i++) {
      let row = this.attachments[i];
      const src =
        "https://dashboard.eye-fi.com/attachments/capa/" + row.fileName;
      const caption = "Image " + i + "- " + row.createdDate;
      const thumb =
        "https://dashboard.eye-fi.com/attachments/capa/" + row.fileName;
      const item = {
        src: src,
        caption: caption,
        thumb: thumb,
      };
      this.images.push(item);
    }
  }

  open(index: number): void {
    // open lightbox
    this.lightbox.open(this.images, index, {});
  }

  close(): void {
    // close lightbox programmatically
    this.lightbox.close();
  }

  async deleteAttachment(id, index) {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  @ViewChild("fileInput") fileInput: ElementRef;
  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "Capa Request");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", "capa");
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++;
        } catch (err) { }
      }
      this.fileInput.nativeElement.value = "";

      this.isLoading = false;
      try {
        this.getAttachments();
        this.myFiles = [];
      } catch (err) { }
    }
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
              .pagebreak { page-break-before: always; } /* page-break-after works, as well */

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
