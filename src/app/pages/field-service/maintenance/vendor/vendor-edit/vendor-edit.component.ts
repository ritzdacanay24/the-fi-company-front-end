import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { VendorFormComponent } from "../vendor-form/vendor-form.component";
import { NAVIGATION_ROUTE } from "../vendor-constant";
import { VendorService } from "src/app/core/api/field-service/vendor.service";
import { SharedModule } from "src/app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, VendorFormComponent],
  selector: "app-vendor-edit",
  templateUrl: "./vendor-edit.component.html",
  styleUrls: ["./vendor-edit.component.scss"],
})
export class VendorEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VendorService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit Vendor";

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
