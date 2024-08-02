import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../user-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { NewUserService } from "@app/core/api/users/users.service";
import { UserCreateFormComponent } from "../forms/create-form/user-create-form.component";

@Component({
  standalone: true,
  imports: [SharedModule, UserCreateFormComponent, UserSearchV1Component],
  selector: "app-user-create",
  templateUrl: "./user-create.component.html",
})
export class UserCreateComponent {
  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private api: NewUserService
  ) {}

  ngOnInit(): void {}

  title = "Create User";

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
      queryParams: { id: id },
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

    if (this.form.value.confirmPassword !== this.form.value.pass) {
      alert("Password does not match");
      return;
    }

    delete this.form.value.confirmPassword;

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
