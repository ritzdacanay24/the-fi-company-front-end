import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../graphics-bom-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { GraphicsBomService } from "@app/core/api/operations/graphics/graphics-bom.service";
import { GraphicsBomFormComponent } from "../graphics-bom-form/graphics-bom-form.component";

@Component({
  standalone: true,
  imports: [SharedModule, GraphicsBomFormComponent],
  selector: "app-graphics-bom-create",
  templateUrl: "./graphics-bom-create.component.html",
})
export class GraphicsBomCreateComponent {
  constructor(
    private router: Router,
    private api: GraphicsBomService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  title = "Create Graphics BOM";

  form: any;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        createdBy: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
  }

  async onSubmit(submitAnother = false) {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      this.isLoading = false;
      this.toastrService.success("Successfully Created");

      if (submitAnother) {
        //this.form.reset()
      } else {
        this.router.navigate([NAVIGATION_ROUTE.EDIT], {
          queryParamsHandling: "merge",
          queryParams: { id: insertId },
        });
      }
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
