import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../user-constant";
import { SharedModule } from "@app/shared/shared.module";
import { NgbDropdownModule, NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { UserEditComponent } from "../user-edit/user-edit.component";
import { UserPasswordComponent } from "../user-password/user-password.component";
import { UserPermissionsComponent } from "../user-permissions/user-permissions.component";
import { UserEditFormComponent } from "../forms/edit-form/user-edit-form.component";
import { NewUserService } from "@app/core/api/users/users.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    UserEditFormComponent,
    NgbDropdownModule,
    NgbNavModule,
    UserEditComponent,
    UserPasswordComponent,
    UserPermissionsComponent,
  ],
  selector: "app-user-overview",
  templateUrl: "./user-overview.component.html",
})
export class UserOverviewComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: NewUserService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.active = Number(params["active"]) || this.active;
    });

    if (this.id) this.getData();
  }

  jobInfo;

  showTicket;
  workOrderInfo;
  connectingJobs;
  submitted;

  active = 1;

  onNavChange($event) {
    $event.preventDefault();
    this.router.navigate(["."], {
      queryParams: {
        active: $event?.nextId,
      },
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
    });
  }

  title = "Edit User";

  form: FormGroup;

  id = null;

  isLoading = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(this.data);
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      if (this.data.workArea) {
        this.data.workArea = this.data.workArea.split(",");
      }
    } catch (err) {}
  }

  async onSubmit() {
    this.submitted = true;

    if (
      this.form.invalid &&
      (this.form.value.isEmployee == 1 && this.form.value.active == 1)
    ) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, {
        ...this.form.value,
        workArea: this.form.value.workArea?.toString(),
      });
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

  file: File = null;

  myFiles: any;

  onFilechange(event: any) {
    this.myFiles = event.target.files;
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append("file", this.myFiles[0]);
      try {
        await this.api.uploadfile(this.id, formData);
      } catch (err) {}

      this.isLoading = false;
      await this.getData();
    }
  }
}
