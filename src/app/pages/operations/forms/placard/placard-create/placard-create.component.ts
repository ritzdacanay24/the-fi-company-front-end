import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { PlacardFormComponent } from "../placard-form/placard-form.component";
import { NAVIGATION_ROUTE } from "../placard-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IPlacardForm } from "../placard-form/placard-form.type";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";

@Component({
  standalone: true,
  imports: [SharedModule, PlacardFormComponent],
  selector: "app-placard-create",
  templateUrl: "./placard-create.component.html",
})
export class PlacardCreateComponent {
  constructor(
    private router: Router,
    private api: PlacardService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void { }

  title = "Create Placard";

  form: MyFormGroup<IPlacardForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  totalPrints = [];
  
  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
    this.form.get("customer_name").valueChanges.subscribe((val) => {
      if (val?.toLocaleUpperCase() == "BALTEC") {
        this.form.patchValue({ customer_co_por_so: "" }, { emitEvent: false });
        this.form.get("customer_co_por_so").disable();
      } else {
        this.form.get("customer_co_por_so").enable();
      }
    });


    this.form.valueChanges.subscribe(value => {
      this.totalPrints = []
      for (let i = 0; i < this.form.value.total_label_count; i++) {
        let count = i + 1;
        this.totalPrints.push({
          ...this.form.value,
          label_count: count
        })
      }
    });
  }

  async onSubmit() {
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

      this.router.navigate([NAVIGATION_ROUTE.EDIT], {
        queryParamsHandling: "merge",
        queryParams: { id: insertId },
      });
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
