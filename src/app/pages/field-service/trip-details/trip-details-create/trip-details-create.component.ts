import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../trip-details-constant";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";

@Component({
  standalone: true,
  imports: [SharedModule, TripDetailsFormComponent],
  selector: "app-trip-details-create",
  templateUrl: "./trip-details-create.component.html",
})
export class TripDetailsCreateComponent {
  constructor(
    private router: Router,
    private api: TripDetailService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {}

  title = "Create trip detail";

  form: FormGroup;

  isLoading = false;

  sendEmail = true;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
      queryParams: { id: id },
    });
  };

  setFormEmitter($event: FormGroup<any>) {
    this.form = $event;
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;

      let d = {
        ...this.form.value,
        ...this.form.value.address,
      };

      let data = await this.api.create(d);

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
