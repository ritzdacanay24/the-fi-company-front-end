import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { JobStatusFormComponent } from "../job-status-form/job-status-form.component";
import { NAVIGATION_ROUTE } from "../job-status-constant";
import { StatusCategoryService } from "@app/core/api/field-service/status-category.service";

@Component({
  standalone: true,
  imports: [SharedModule, JobStatusFormComponent],
  selector: "app-job-status-create",
  templateUrl: "./job-status-create.component.html",
  styleUrls: ["./job-status-create.component.scss"],
})
export class JobStatusCreateComponent {
  constructor(
    private router: Router,
    private api: StatusCategoryService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {}

  title = "Create Job Status";

  form: FormGroup;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
      queryParams: { id: id },
    });
  };

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      let data = await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.goBack(data.insertId);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
