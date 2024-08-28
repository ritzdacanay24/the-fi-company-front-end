import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { FormGroup } from "@angular/forms";
import moment from "moment";
import { ActivatedRoute, Router } from "@angular/router";
import { RequestService } from "@app/core/api/field-service/request.service";
import { CommentsService } from "@app/core/api/field-service/comments.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FIELD_SERVICE } from "@app/pages/field-service/field-service-constant";
import { RequestFormComponent } from "@app/pages/field-service/request/request-form/request-form.component";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { AutosizeModule } from "ngx-autosize";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { RequestChangeModalService } from "@app/pages/field-service/request/request-change/request-change-modal.component";

@Component({
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SharedModule, RequestFormComponent, AutosizeModule],
  selector: "app-request-public",
  templateUrl: "./request-public.component.html",
  styleUrls: ["./request-public.component.scss"],
})
export class RequestPublicComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    private requestService: RequestService,
    private commentsService: CommentsService,
    private router: Router,
    private cdref: ChangeDetectorRef,
    private attachmentsService: AttachmentsService,
    private requestChangeModalService: RequestChangeModalService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.token = params["token"];
      this.viewComment = params["viewComment"];
    });

    if (this.token) this.getData();
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  title = "Field Service Request Form";

  form: FormGroup;

  token = null;

  viewComment = false;

  isLoading = false;

  submitted = false;

  request_id = null;

  comments: any = [];

  jobInfo: any;

  myDatepickerOptions;

  disabled = false;

  async onRequestChanges() {
    this.requestChangeModalService
      .open({
        request_id: this.request_id,
        data: this.form.getRawValue(),
      })
      .result.then(
        async (result) => {
          await this.getComments();
        },
        (reason) => {}
      );
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.get("active").disable();
  }

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue(
      { created_date: moment().format("YYYY-MM-DD HH:mm:ss") },
      { emitEvent: false }
    );

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      SweetAlert.loading("Saving. Please wait.");
      let data: any = await this.requestService.createFieldServiceRequest(
        this.form.value
      );
      this.submitted = false;
      this.form.disable();
      this.router.navigate([`request`], { queryParams: { token: data.token } });

      this.token = data.token;

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
          formData.append("uniqueData", `${data.id}`);
          formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
          try {
            await this.attachmentsService.uploadfilePublic(formData);
          } catch (err) {}
        }
      }

      await this.getData();

      SweetAlert.close();

      SweetAlert.fire({
        text: `Request submitted successfully. Your request ID # is ${data.id}. `,
      });
    } catch (err) {
      alert("Sorry. Somthing went wrong.");
      SweetAlert.close(0);
    }
  }

  attachments;
  async getAttachments() {
    this.attachments = await this.attachmentsService.getAttachmentByRequestId(
      this.request_id
    );
  }

  data;

  async getData() {
    try {
      this.isLoading = true;
      let data: any = (this.data = await this.requestService.getByToken(
        this.token
      ));
      this.request_id = data.id;
      this.comments = await this.commentsService.getByRequestId(
        this.request_id
      );
      this.jobInfo = await this.requestService.getjobByRequestId(
        this.request_id
      );

      this.isLoading = false;

      if (data?.cc_email) {
        data.cc_email = data.cc_email.split(",");
      }

      this.form.patchValue(data);

      this.form.disable();

      this.disabled = true;

      await this.getAttachments();

      await this.getComments();

      if (this.viewComment) {
        this.goToComments();
      }
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCreateNew(navigate = true) {
    this.router.navigate([`request`]).then(() => {
      window.location.reload();
    });
  }

  async getComments() {
    this.comments = await this.commentsService.getByRequestId(this.request_id);
  }

  name = "";
  comment = "";
  request_change = false;
  async onSubmitComment() {
    if (this.name == "" || this.comment == "") {
      alert("All comment fields required");
      return;
    }

    SweetAlert.loading("Saving. Please wait.");
    try {
      await this.commentsService.createComment(
        this.form.value.token,
        this.form.value.email,
        {
          name: this.name,
          comment: this.comment,
          request_change: this.request_change,
          fs_request_id: this.request_id,
          created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        }
      );
      this.comment = "";
      this.request_change = false;
      this.getComments();
      SweetAlert.close();
    } catch (err) {
      alert(`Something went wrong. Please contact administrator`);
      SweetAlert.close(0);
    }
  }

  goToComments() {
    setTimeout(() => {
      document.getElementById("mydiv1").scrollIntoView();
    }, 0);
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  UPLOAD_LINK = FIELD_SERVICE.UPLOAD_LINK;

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
        formData.append("uniqueData", `${this.request_id}`);
        formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
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
