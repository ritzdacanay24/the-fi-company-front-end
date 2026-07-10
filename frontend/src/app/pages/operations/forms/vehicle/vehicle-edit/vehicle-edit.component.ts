import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../vehicle-constant";
import { VehicleFormComponent } from "../vehicle-form/vehicle-form.component";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IVehicleForm } from "../vehicle-form/vehicle-form.type";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent],
  selector: "app-vehicle-edit",
  templateUrl: "./vehicle-edit.component.html",
})
export class VehicleEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VehicleService,
    private toastrService: ToastrService,
  
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: MyFormGroup<IVehicleForm>;

  id = null;

  isLoading = false;

  submitted = false;
  readonly FeatureType = FeatureType;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      if (this.form) {
        this.form.patchValue(this.data);
      }
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
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

  onFormReady(form: MyFormGroup<IVehicleForm>): void {
    this.form = form;
    if (this.data) {
      this.form.patchValue(this.data);
    }
  }
}