import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { PartsOrderService } from "@app/core/api/field-service/parts-order/parts-order.service";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { CustomerVisitFormComponent } from "../customer-visit-form/customer-visit-form.component";

@Component({
  standalone: true,
  imports: [SharedModule, CustomerVisitFormComponent],
  selector: "app-customer-visit-create",
  templateUrl: "./customer-visit-create.component.html",
  styleUrls: [],
})
export class CustomerVisitCreateComponent implements OnInit {
  currentUrl: string;

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public partsOrderService: PartsOrderService,
    public authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  submitted = false;

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

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", "FS Parts Order");
          formData.append("uniqueData", `${insertId}`);
          formData.append("folderName", "fieldService");
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
    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });
  };

  title = "Parts Order Form";

  form: FormGroup;

  isLoading = false;

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }
}
