import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "src/app/shared/shared.module";
import { CustomerService } from "src/app/core/api/field-service/customer.service";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { ToastrService } from "ngx-toastr";

interface RecipientRow {
  id?: number;
  email: string;
  isActive: boolean;
}

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  selector: "app-customer-form",
  templateUrl: "./customer-form.component.html",
  styleUrls: ["./customer-form.component.scss"],
})
export class CustomerFormComponent implements OnInit {
  constructor(private fb: FormBuilder, private api: CustomerService, private toastrService: ToastrService) {}

  @Input() customerId: number | null = null;
  @Output() setFormEmitter = new EventEmitter<any>();
  @Input() submitted = false;
  @ViewChild("emailTableWrap") emailTableWrap?: ElementRef<HTMLDivElement>;

  emailDraft = "";
  recipients: RecipientRow[] = [];
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form = this.fb.group({
    name: [""],
    image: [""],
    active: [1],
    background_color: [""],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    if (this.customerId) {
      this.api.listNotificationRecipients(this.customerId).then((rows) => {
        this.recipients = rows.map((r) => ({ id: r.id, email: r.email, isActive: r.isActive }));
      });
    }
    this.setFormEmitter.emit(this.form);
  }

  setBooleanToNumber(key: string) {
    const e = this.form.value[key as keyof typeof this.form.value];
    this.form.get(key)!.patchValue(e ? 1 : 0);
  }

  async addEmail() {
    const email = this.emailDraft.trim().toLowerCase();
    this.emailDraft = "";
    if (!email || !this.emailPattern.test(email)) return;
    if (this.recipients.some((r) => r.email === email)) {
      this.toastrService.warning("Email already exists in notification recipients.");
      return;
    }

    if (this.customerId) {
      const updated = [...this.recipients, { email, isActive: true }];
      const result = await this.api.updateNotificationRecipients(this.customerId, updated);
      this.recipients = result.map((r) => ({ id: r.id, email: r.email, isActive: r.isActive }));
    } else {
      this.recipients = [...this.recipients, { email, isActive: true }];
    }

    this.toastrService.success("Notification email added.");
    this.scrollToLatestRecipient();
  }

  async removeEmail(index: number) {
    const recipient = this.recipients[index];
    if (!recipient) return;
    const { value: confirmed } = await SweetAlert.confirmV1({
      title: "Remove recipient?",
      text: `Remove ${recipient.email} from notifications?`,
      icon: "warning",
      confirmButtonText: "Remove",
    });
    if (!confirmed) return;
    if (this.customerId && recipient.id) {
      await this.api.deleteNotificationRecipient(this.customerId, recipient.id);
    }
    this.recipients = this.recipients.filter((_, i) => i !== index);
  }

  getRecipients(): RecipientRow[] {
    return this.recipients;
  }

  private scrollToLatestRecipient() {
    setTimeout(() => {
      const wrap = this.emailTableWrap?.nativeElement;
      if (!wrap) return;

      const rows = wrap.querySelectorAll("tbody tr");
      const latestRow = rows.item(rows.length - 1) as HTMLElement | null;
      if (!latestRow) return;

      latestRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }
}
