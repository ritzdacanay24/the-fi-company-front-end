import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { UserEditFormComponent } from "../forms/edit-form/user-edit-form.component";
import { NewUserService } from "@app/core/api/users/users.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

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

    if (
      this.form.invalid &&
      this.form.value.isEmployee == 1 &&
      this.form.value.active == 1 &&
      this.form.value.orgChartPlaceHolder == 1
    ) {
      this.submitted = false;
      getFormValidationErrors();
      return;
    }

    await this.userService.update(this.id, this.form.value);

    this.toastrService.success("Updated successfully");
  }

  file: File = null;

  myFiles: any;

  onFilechange(event: any) {
    this.myFiles = event.target.files;
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();

      formData.append("file", this.myFiles);

      try {
        await this.userService.uploadfile(this.id, formData);
        totalAttachments++;
      } catch (err) {}

      this.isLoading = false;
      await this.getData();
    }
  }

  async getData() {
    let data = await this.userService.getById(this.id);
    this.form.patchValue(data);
  }
}
