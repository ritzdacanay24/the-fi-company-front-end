import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../email-notification-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { EmailNotificationFormComponent } from "../email-notification-form/email-notification-form.component";
import { EmailNotificationService } from "@app/core/api/email-notification/email-notification.component";
import Swal from "sweetalert2";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    EmailNotificationFormComponent,
    UserSearchV1Component,
  ],
  selector: "app-email-notification-create",
  templateUrl: "./email-notification-create.component.html",
})
export class EmailNotificationCreateComponent {
  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private api: EmailNotificationService
  ) {}

  recipientSearchValue: any = null;

  addTag = async ($event) => {
    try {
      this.form.patchValue({ notification_emails: $event, user_id: null });
      await this.api.create(this.form.value);
      this.form.patchValue({ notification_emails: null });
      this.recipientSearchValue = null;
      await this.getByFileName(this.fileNameLocation);
      return;
    } catch (err) {}
  };

  fileNameLocation;
  setFormEmitter(event) {
    this.form = event;
    this.form.controls["location"].valueChanges.subscribe((change) => {
      this.fileNameLocation = change;
      this.getByFileName(change);
    });
  }

  ngOnInit(): void {}

  listByFileName = [];
  async getByFileName(location) {
    try {
      if (!location) {
        this.listByFileName = [];
        return;
      }

      this.listByFileName = await this.api.find({
        location: location,
      });
    } catch (err) {}
  }

  data: any;

  async notifyParent($event) {
    let isFound = false;
    for (let i = 0; i < this.listByFileName.length; i++) {
      if (
        this.listByFileName[i].user_id == $event.id &&
        this.fileNameLocation == this.listByFileName[i].location
      ) {
        this.toastrService.warning("User already exists in this notification group.");
        isFound = true;
        break;
      }
    }

    if (!isFound) {
      this.form.patchValue({ user_id: $event?.id });
      await this.api.create(this.form.value);
      this.form.patchValue({ user_id: null });
      this.recipientSearchValue = null;
      this.getByFileName(this.fileNameLocation);
    }
  }

  async removeById(id) {
    const result = await Swal.fire({
      title: "Remove recipient?",
      text: "This recipient will stop receiving this notification.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) return;

    await this.api.delete(id);
    this.toastrService.success("Recipient removed.");
    this.getByFileName(this.fileNameLocation);
  }

  title = "Create Notification & Access";

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
      queryParams: { id: id ?? null },
    });
  };

  form: any;

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue({
      createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
      created_by: this.authenticationService.currentUserValue.id,
    });

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      let data: any = await this.api.create(this.form.value);

      if (data?.error) {
        this.toastrService.error(data?.message);
      } else {
        this.toastrService.success("Successfully Created");

        this.router.navigate([NAVIGATION_ROUTE.EDIT], {
          queryParamsHandling: "merge",
          queryParams: { id: data.insertId },
        });

        //this.goBack(data.insertId);
      }

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
