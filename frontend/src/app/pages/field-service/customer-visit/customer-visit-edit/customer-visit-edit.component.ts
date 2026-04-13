import { Component, Input } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { SharedModule } from "@app/shared/shared.module";
import { PartsOrderService } from "@app/core/api/field-service/parts-order/parts-order.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { Lightbox } from "ngx-lightbox";
import { CustomerVisitFormComponent } from "../customer-visit-form/customer-visit-form.component";
import { CustomerVisitDetailService } from "@app/core/api/field-service/customer-visit-detail/customer-visit-detail.service";
import { CustomerVisitService } from "@app/core/api/field-service/customer-visit/customer-visit.service";

@Component({
  standalone: true,
  imports: [SharedModule, CustomerVisitFormComponent],
  selector: "app-customer-visit-edit",
  templateUrl: "./customer-visit-edit.component.html",
})
export class CustomerVisitEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private customerVisitService: CustomerVisitService,
    private api: CustomerVisitDetailService,
    private lightbox: Lightbox
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate(["../"], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });
  };

  data: any;
  details: any;

  images = [];
  async getData() {
    this.images = [];
    try {
      this.data = await this.customerVisitService.getById(this.id);
      this.details = await this.api.find({ customer_visit_log_id: this.id });

      let index = 0;
      for (let i = 0; i < this.details.length; i++) {
        for (let ii = 0; ii < this.details[i].attachments.length; ii++) {
          let row = this.details[i].attachments[ii];

          if (!row.index) {
            row.index = 0;
          }

          row.index += index++;
          const src = row.link;
          const caption =
            "Image " +
            ii +
            "- " +
            this.details[i].sign_theme +
            " " +
            this.details[i].serial_number +
            " " +
            this.details[i].manufacture +
            " " +
            this.details[i].description_of_issue;
          const thumb = row.link;
          const item = {
            src: src,
            caption: caption,
            thumb: thumb,
          };
          this.images.push(item);
        }
      }

      this.form.patchValue({ header: this.data });
      this.form.disable();
    } catch (err) {}
  }

  viewAttachment(index) {
    this.lightbox.open(this.images, index, {});
  }

  onCancel() {
    this.goBack();
  }

  close(): void {
    // close lightbox programmatically
    this.lightbox.close();
  }
}
