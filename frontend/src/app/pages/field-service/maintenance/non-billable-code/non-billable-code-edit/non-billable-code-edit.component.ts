import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NonBillableCodeFormComponent } from "../non-billable-code-form/non-billable-code-form.component";
import { NAVIGATION_ROUTE } from "../non-billable-code-constant";
import { NonBillableCodeService } from "@app/core/api/field-service/fs_non_billable_code.service";

@Component({
  standalone: true,
  imports: [SharedModule, NonBillableCodeFormComponent],
  selector: "app-non-billable-code-edit",
  templateUrl: "./non-billable-code-edit.component.html",
  styleUrls: ["./non-billable-code-edit.component.scss"],
})
export class NonBillableCodeEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: NonBillableCodeService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

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
