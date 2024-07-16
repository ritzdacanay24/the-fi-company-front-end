import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { GraphicsFormComponent } from "../graphics-form/graphics-form.component";
import { NAVIGATION_ROUTE } from "../graphics-constant";
import { IGraphicsForm } from "../graphics-form/graphics-form.type";
import { GraphicsService } from "@app/core/api/operations/graphics/graphics.service";

@Component({
  standalone: true,
  imports: [SharedModule, GraphicsFormComponent],
  selector: "app-graphics-edit",
  templateUrl: "./graphics-edit.component.html",
})
export class GraphicsEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: GraphicsService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: MyFormGroup<IGraphicsForm>;

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
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      this.form.get("graphicsWorkOrder").disable();
      this.form.get("ordered_date").disable();
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

  onPrint() {
    var printContents = document.getElementById("pickSheet").innerHTML;
    var popupWin = window.open("", "_blank", "width=1000,height=600");
    popupWin.document.open();
    var pathCss =
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    popupWin.document.write(
      '<html><head><link type="text/css" rel="stylesheet" media="screen, print" href="' +
        pathCss +
        '" /></head><body onload="window.print()">' +
        printContents +
        "</body></html>"
    );
    popupWin.document.close();
    popupWin.onload = function () {
      popupWin.print();
      popupWin.close();
    };
  }
}
