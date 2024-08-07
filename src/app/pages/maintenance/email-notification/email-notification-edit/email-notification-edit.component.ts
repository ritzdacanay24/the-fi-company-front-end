import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../email-notification-constant";
import { SharedModule } from "@app/shared/shared.module";
import { EmailNotificationFormComponent } from "../email-notification-form/email-notification-form.component";
import { EmailNotificationService } from "@app/core/api/email-notification/email-notification.component";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    EmailNotificationFormComponent,
    UserSearchV1Component,
  ],
  selector: "app-email-notification-edit",
  templateUrl: "./email-notification-edit.component.html",
})
export class EmailNotificationEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: EmailNotificationService,
    private toastrService: ToastrService
  ) {}

  addTag = async ($event) => {
    try {
      this.form.patchValue({ notification_emails: $event });
      await this.api.create({ ...this.form.getRawValue() });
      this.form.patchValue({ notification_emails: null });
      this.getByFileName();
    } catch (err) {}
  };

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit User";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      this.form.get("location").disable();
      await this.getByFileName();
    } catch (err) {}
  }

  listByFileName;
  async getByFileName() {
    try {
      this.listByFileName = await this.api.find({
        location: this.data.location,
      });
    } catch (err) {}
  }

  async notifyParent($event) {
    let isFound = false;
    for (let i = 0; i < this.listByFileName.length; i++) {
      if (
        this.listByFileName[i].user_id == $event.id &&
        this.data.location == this.listByFileName[i].location
      ) {
        alert("User already in list");
        isFound = true;
        break;
      }
    }

    if (!isFound) {
      this.form.patchValue({ user_id: $event?.id });
      await this.api.create({ ...this.form.getRawValue() });
      this.form.patchValue({ user_id: null });
      this.getByFileName();
    }
  }

  async removeById(id) {
    if (!confirm("Are you sure you want to remove?")) return;
    await this.api.delete(id);
    this.getByFileName();
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
