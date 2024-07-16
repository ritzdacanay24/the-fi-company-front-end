import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { UserFormComponent } from "../user-form/user-form.component";
import { NAVIGATION_ROUTE } from "../user-constant";
import { UserService } from "@app/core/api/field-service/user.service";
import { SharedModule } from "@app/shared/shared.module";
import { NgbDropdownModule, NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { UserEditComponent } from "../user-edit/user-edit.component";
import { UserPasswordComponent } from "../user-password/user-password.component";
import { UserPermissionsComponent } from "../user-permissions/user-permissions.component";
import { UserInfoComponent } from "../user-info/user-info.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    UserFormComponent,
    NgbDropdownModule,
    NgbNavModule,
    UserEditComponent,
    UserPasswordComponent,
    UserPermissionsComponent,
    UserInfoComponent,
  ],
  selector: "app-user-overview",
  templateUrl: "./user-overview.component.html",
})
export class UserOverviewComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: UserService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  jobInfo;

  showTicket;
  workOrderInfo;
  connectingJobs;

  active = 1;

  onNavChange($event) {}

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
      this.form.get("type").disable();
    } catch (err) {}
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

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
