import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { UserEditFormComponent } from "../forms/edit-form/user-edit-form.component";
import { NewUserService } from "@app/core/api/users/users.service";

@Component({
  standalone: true,
  imports: [SharedModule, UserEditFormComponent],
  selector: "app-user-info",
  templateUrl: "./user-info.component.html",
})
export class UserInfoComponent {
  title = "User Info";
  isLoading = false;

  constructor(
    private userService: NewUserService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.id) this.getData();
  }

  @Input() id = null;

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  form: any;

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    await this.userService.update(this.id, this.form.value);

    this.toastrService.success("Updated successfully");
  }

  async getData() {
    let data = await this.userService.getById(this.id);
    this.form.patchValue(data);
  }
}
