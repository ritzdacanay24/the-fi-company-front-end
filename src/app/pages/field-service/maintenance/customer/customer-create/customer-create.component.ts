import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { CustomerFormComponent } from "../customer-form/customer-form.component";
import { NAVIGATION_ROUTE } from "../customer-constant";
import moment from "moment";
import { CustomerService } from "src/app/core/api/field-service/customer.service";
import { AuthenticationService } from "src/app/core/services/auth.service";
import { SharedModule } from "src/app/shared/shared.module";
import { ToastrService } from "ngx-toastr";

@Component({
  standalone: true,
  imports: [SharedModule, CustomerFormComponent],
  selector: "app-customer-create",
  templateUrl: "./customer-create.component.html",
  styleUrls: ["./customer-create.component.scss"],
})
export class CustomerCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: CustomerService,
    public toastservice: ToastrService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Create Customer";

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

    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastservice.show("Successfully Created");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
