import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../igt-transfer-constant";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IgtTransferFormComponent } from "../igt-transfer-form/igt-transfer-form.component";
import { IgtTransferService } from "@app/core/api/operations/igt-transfer/igt-transfer.service";
declare var dymo: any; // Declare the dymo object
dymo.label.framework.init() //Initialize DYMO Label Framework

@Component({
  standalone: true,
  imports: [SharedModule, IgtTransferFormComponent],
  selector: "app-igt-transfer-create",
  templateUrl: "./igt-transfer-create.component.html",
})
export class IgtTransferCreateComponent {
  constructor(
    private router: Router,
    private api: IgtTransferService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {

    if (typeof dymo === 'undefined' || typeof dymo.label === 'undefined' || typeof dymo.label.framework === 'undefined') {
      console.error('DYMO framework is not loaded or initialized.');
      return;
    }
  }

  title = "Create IGT Transfer";

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
    this.form.patchValue({
      main: {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      },
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
