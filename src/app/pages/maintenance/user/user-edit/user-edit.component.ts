import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../user-constant";
import { SharedModule } from "@app/shared/shared.module";
import { UserEditFormComponent } from "../forms/edit-form/user-edit-form.component";
import { NewUserService } from "@app/core/api/users/users.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [SharedModule, UserEditFormComponent],
  selector: "app-user-edit",
  templateUrl: "./user-edit.component.html",
})
export class UserEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: NewUserService,
    private toastrService: ToastrService
  ) {}

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
      this.form.get("type").disable();
    } catch (err) {}
  }

  async onSubmit() {
    this.submitted = true;

    if (
      this.form.invalid &&
      this.form.value.isEmployee == 1 &&
      this.form.value.active == 1
    ) {
      this.submitted = false;
      getFormValidationErrors();
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
