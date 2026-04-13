import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { LicenseEntityFormComponent } from "../license-entity-form/license-entity-form.component";
import { NAVIGATION_ROUTE } from "../license-entity-constant";
import { LicenseService } from "@app/core/api/field-service/license.service";
import { UserService } from "@app/core/api/field-service/user.service";
import { NgSelectModule } from "@ng-select/ng-select";

//This page will represent, the license property details. I am debating if this should be using the property component, so it does not
//cause the components to duplicate. Only difference is about the compliance details, listed in the compliance information.

@Component({
  standalone: true,
  imports: [SharedModule, LicenseEntityFormComponent, NgSelectModule],
  selector: "app-license-entity-create",
  templateUrl: "./license-entity-create.component.html",
  styleUrls: ["./license-entity-create.component.scss"],
})
export class LicenseEntityCreateComponent {
  constructor(
    private router: Router,
    private api: LicenseService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.getUserService();
  }

  //start licensed techs

  licensed_techs = [];
  techs = [];

  onTechAdd($event) {
    this.techs.push($event);
  }

  onTechRemove(i, row) {
    this.techs.splice(i, 1);
    this.licensed_techs = this.licensed_techs.filter((s) => s != row.user_id);
  }

  users$: any;
  getUserService = async () => {
    try {
      let data: any = await this.userService.find({
        area: "Field Service",
        active: 1,
        access: 1,
      });

      this.users$ = [];
      for (let i = 0; i < data.length; i++) {
        let row = data[i];
        this.users$.push({
          fs_licensed_id: null,
          user_id: row.id,
          user_name: row.first + " " + row.last,
          expired_date: null,
          licensed_required: "Yes",
          notes: "",
        });
      }
    } catch (err) {}
  };

  //end licensed techs

  title = "Create License";

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

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      this.form.value.created_by =
        this.authenticationService.currentUserValue.id;
      this.form.value.created_date = moment().format("YYYY-MM-DD HH:mm:ss");

      let d = {
        data: this.form.value,
        techs: this.techs,
      };

      let data = await this.api.create(d);
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
