import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { QirSettingsFormComponent } from "../qir-settings-form/qir-settings-form.component";
import { QirSettingsService } from "@app/core/api/quality/qir-settings.service";
import { NAVIGATION_ROUTE } from "../qir-settings-constant";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [SharedModule, QirSettingsFormComponent],
  selector: "app-qir-settings-edit",
  templateUrl: "./qir-settings-edit.component.html",
  styleUrls: ["./qir-settings-edit.component.scss"],
})
export class QirSettingsEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirSettingsService,
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
    } catch (err) {}
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
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
