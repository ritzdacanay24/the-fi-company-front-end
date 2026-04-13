import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../platform-constant";
import { PlatformFormComponent } from "../platform-form/platform-form.component";
import { PlatformService } from "@app/core/api/field-service/platform.service";

@Component({
  standalone: true,
  imports: [SharedModule, PlatformFormComponent],
  selector: "app-platform-create",
  templateUrl: "./platform-create.component.html",
  styleUrls: ["./platform-create.component.scss"],
})
export class PlatformCreateComponent {
  constructor(
    private router: Router,
    private api: PlatformService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {}

  title = "Create platform";

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
