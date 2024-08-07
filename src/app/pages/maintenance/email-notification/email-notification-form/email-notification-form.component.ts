import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { emailNotificationfileNames } from "../email-notification-constant";
import { EmailNotificationService } from "@app/core/api/email-notification/email-notification.component";
import _ from "lodash";

@Component({
  standalone: true,
  imports: [SharedModule, UserSearchV1Component],
  selector: "app-email-notification-form",
  templateUrl: "./email-notification-form.component.html",
})
export class EmailNotificationFormComponent {
  constructor(private fb: FormBuilder, private api: EmailNotificationService) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    this.getOptions();
  }

  title = "Create User Form";

  isLoading = false;

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  notifyParent($event) {
    this.form.patchValue({ user_id: $event?.id });
  }

  form = this.fb.group({
    user_id: [],
    location: [null],
    notification_emails: null,
  });

  fileName: any;

  async getOptions() {
    let data = await this.api.getOptions();
    this.fileName = _.groupBy(data, "category");
  }
}
