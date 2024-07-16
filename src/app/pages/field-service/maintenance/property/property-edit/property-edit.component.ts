import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { PropertyFormComponent } from "../property-form/property-form.component";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { PropertyService } from "@app/core/api/field-service/property.service";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../property-constant";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { LicenseService } from "@app/core/api/field-service/license.service";
import { LicenseEntitySearchComponent } from "@app/shared/components/license-entity-search/license-entity-search.component";

@Component({
  standalone: true,
  imports: [SharedModule, PropertyFormComponent, LicenseEntitySearchComponent],
  selector: "app-property-edit",
  templateUrl: "./property-edit.component.html",
  styleUrls: ["./property-edit.component.scss"],
})
export class PropertyEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: PropertyService,
    private licenseService: LicenseService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  async onRemoveLicenseEntity() {
    if (!confirm("Are you sure you want to remove?")) return;
    try {
      await this.api.update(this.id, { fs_licensed_id: null });
      this.licensedInfo = {};
    } catch (err) {}
  }

  async notifyLicenseParent($event) {
    let data: any = await this.licenseService.getByIdAndTechs($event.id);
    this.licensedInfo = data;
    this.form.get("fs_licensed_id").patchValue($event.id);
  }

  title = "Edit Property";

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
      if (this.data.fs_licensed_id) {
        this.getLicensedInformation();
      }
    } catch (err) {}
  }

  licensedInfo = null;
  async getLicensedInformation() {
    this.licensedInfo = await this.licenseService.getByIdAndTechs(
      this.data.fs_licensed_id
    );
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid && this.form.value.active == 1) {
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
