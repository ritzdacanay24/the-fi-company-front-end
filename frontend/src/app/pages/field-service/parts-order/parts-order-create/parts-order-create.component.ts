import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { PartsOrderFormComponent } from "../parts-order-form/parts-order-form-component";
import { FormGroup } from "@angular/forms";
import { PartsOrderService } from "@app/core/api/field-service/parts-order/parts-order.service";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { NAVIGATION_ROUTE, PARTS_ORDER_ATTACHMENT } from "../parts-order-constant";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";

@Component({
  standalone: true,
  imports: [SharedModule, PartsOrderFormComponent, UploadNewAttachmentsComponent],
  selector: "app-parts-order-create",
  templateUrl: "./parts-order-create.component.html",
  styleUrls: [],
})
export class PartsOrderCreateComponent implements OnInit {
  currentUrl: string;

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public partsOrderService: PartsOrderService,
    public authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  ngOnInit(): void {}

  onCancel() {
    this.goBack();
  }

  async onSubmit() {
    try {
      if (this.form.value.details.length == 0) {
        alert("You have not items in your cart. Unable to submit request.");
        return;
      }

      this.form.value.details = JSON.stringify(this.form.value.details);

      this.isLoading = true;
      this.form.value.created_date = moment().format("YYYY-MM-DD HH:mm:ss");
      this.form.value.created_by =
        this.authenticationService.currentUserValue.id;
      let { insertId } = await this.partsOrderService.create(this.form.value);

      if (this.myFiles?.length) {
        for (var i = 0; i < this.myFiles.length; i++) {
          const formData = new FormData();
          formData.append("file", this.myFiles[i]);
          formData.append("field", PARTS_ORDER_ATTACHMENT.FIELD);
          formData.append("uniqueData", `${insertId}`);
          formData.append("subFolder", PARTS_ORDER_ATTACHMENT.SUB_FOLDER);
          await this.attachmentsService.uploadfile(formData);
        }
      }

      this.isLoading = false;
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  title = "Parts Order Form";

  form: FormGroup;

  submitted = false;

  isLoading = false;

  uploadTriggerMode: "manual" | "on-add" | "parent-submit" = "parent-submit";

  file: File = null;

  myFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.myFiles = [...this.myFiles, ...files];
  }

  removeFile(index: number) {
    this.myFiles.splice(index, 1);
  }
}
