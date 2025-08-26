import { NgSelectComponent, NgSelectModule } from "@ng-select/ng-select";
import {
  Component,
  Input,
  OnInit,
  Sanitizer,
  SimpleChanges,
} from "@angular/core";
import { CrashKitService } from "@app/core/api/field-service/crash-kit.service";
import { NgbDatepickerModule, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { AttachmentService } from "@app/core/api/field-service/attachment.service";
import { BillingModalService } from "./billing.modal.component";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { time_now } from "src/assets/js/util/time-now";
import { ToastrService } from "ngx-toastr";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

import { Pipe, PipeTransform } from "@angular/core";
import { BillingService } from "./billing-modal/billing-modal.component";

@Pipe({ name: "safe", standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url) {
    return this.sanitizer.bypassSecurityTrustHtml(url);
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, NgbDatepickerModule, NgSelectModule, SafePipe],
  selector: "app-billing",
  templateUrl: `./billing.component.html`,
})
export class BillingComponent implements OnInit {
  @Input() public workOrderId: string;
  @Input() public disabled: boolean = true;
  @Input() public fsId: number | string;

  ngOnChanges(changes: SimpleChanges) {
    if (changes["workOrderId"]) {
      this.workOrderId = changes["workOrderId"].currentValue;
      this.fsId = changes["fsId"].currentValue;
      this.getData();
    }
  }

  constructor(
    public offcanvasService: NgbOffcanvas,
    public api: CrashKitService,
    public attachmentService: AttachmentService,
    public authenticationService: AuthenticationService,
    private billingModalService: BillingModalService,
    private workOrderService: WorkOrderService,
    private toastrService: ToastrService,
    private sanitizer: DomSanitizer,
    private billingService: BillingService
  ) {}

  ngOnInit() {}

  loading = false;
  status: any;
  approved_denied: any;
  data: any;

  safeHtml: SafeHtml = "";

  async getData() {
    this.data = [];
    try {
      this.loading = true;
      this.data = await this.workOrderService.findOne({ id: this.workOrderId });
      if (!this.data.review_status) this.data.review_status = "Pending Review";

      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(
        this.data.review_link
      );

      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }

  
  getURLFromWord(text) {
    const regex = /<iframe.*?src=['"](.*?)['"]/;

    return regex.exec(text)[1];
    // or alternatively
    // return text.replace(urlRegex, '<a href="$1">$1</a>')
  }

  viewLink() {
    if (!this.data.review_link) {
      this.toastrService.warning("Please add a SharePoint link first");
      return;
    }
    
    // Open the billing modal service with the SharePoint content
    this.billingService.open(this.data.review_link);
  }

  openInNewTab() {
    if (!this.data.review_link) {
      this.toastrService.warning("Please add a SharePoint link first");
      return;
    }

    let url = this.data.review_link;
    
    // If it's an iframe embed code, extract the URL
    if (url.includes('<iframe')) {
      const urlMatch = url.match(/src=['"](.*?)['"]/);
      if (urlMatch && urlMatch[1]) {
        url = urlMatch[1];
      }
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async submit() {
    try {
      this.loading = true;
      await this.workOrderService.updateByIdBillingReview(this.workOrderId, {
        review_link: this.data.review_link,
        review_status: this.data.review_status,
        review_comments: this.data.review_comments,
        review_billing_comments: this.data.review_billing_comments,
        review_approved_denied: this.data.review_approved_denied,
        review_completed_date: this.data.review_approved_denied
          ? time_now()
          : null,
        fs_scheduler_id: this.fsId,
      });
      this.toastrService.success("Saved Successfully");
      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }
}
