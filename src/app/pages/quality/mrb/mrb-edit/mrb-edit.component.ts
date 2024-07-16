import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { MrbFormComponent } from "../mrb-form/mrb-form.component";
import { NAVIGATION_ROUTE } from "../mrb-constant";
import { MrbService } from "@app/core/api/quality/mrb-service";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, MrbFormComponent],
  selector: "app-mrb-edit",
  templateUrl: "./mrb-edit.component.html",
  styleUrls: ["./mrb-edit.component.scss"],
})
export class MrbEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: MrbService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  qualityManagerApproval() {}
  vpApproval() {}

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
