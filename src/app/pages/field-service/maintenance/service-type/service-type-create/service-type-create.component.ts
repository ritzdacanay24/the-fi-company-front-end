import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../service-type-constant";
import { ServiceTypeFormComponent } from "../service-type-form/service-type-form.component";
import { ServiceTypeService } from "@app/core/api/field-service/service-type.service";

@Component({
  standalone: true,
  imports: [SharedModule, ServiceTypeFormComponent],
  selector: "app-service-type-create",
  templateUrl: "./service-type-create.component.html",
  styleUrls: ["./service-type-create.component.scss"],
})
export class ServiceTypeCreateComponent {
  constructor(
    private router: Router,
    private api: ServiceTypeService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {}

  title = "Create Service Type";

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
