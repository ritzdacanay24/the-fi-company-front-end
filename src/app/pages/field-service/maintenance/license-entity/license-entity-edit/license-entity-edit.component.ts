import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { LicenseEntityFormComponent } from "../license-entity-form/license-entity-form.component";
import { NAVIGATION_ROUTE } from "../license-entity-constant";
import { LicenseService } from "@app/core/api/field-service/license.service";
import { UserService } from "@app/core/api/field-service/user.service";
import { NgSelectModule } from "@ng-select/ng-select";
import { LicensedTechsService } from "@app/core/api/field-service/licensed-techs.service";

@Component({
  standalone: true,
  imports: [SharedModule, LicenseEntityFormComponent, NgSelectModule],
  selector: "app-license-entity-edit",
  templateUrl: "./license-entity-edit.component.html",
  styleUrls: ["./license-entity-edit.component.scss"],
})
export class LicenseEntityEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: LicenseService,
    private toastrService: ToastrService,
    private userService: UserService,
    private licensedTechsService: LicensedTechsService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  //start licensed techs

  licensed_techs = [];
  techs = [];

  async onTechAdd($event) {
    try {
      let { insertId } = await this.licensedTechsService.create($event);
      $event.id = insertId;
      this.techs.push($event);
      this.toastrService.success("Tech successfully added.");
    } catch (err) {}
  }

  async onTechRemove(i, row) {
    //remove from table
    try {
      if (!confirm("Are you sure you want to remove tech?")) return;

      await this.licensedTechsService.delete(row.id);
      this.techs.splice(i, 1);

      //remove from ng-select
      this.licensed_techs = this.licensed_techs.filter((s) => s != row.user_id);

      this.toastrService.success("Tech successfully removed.");
    } catch (err) {}
  }

  async onTechUpdated(row) {
    try {
      await this.licensedTechsService.update(row.id, row);
      this.toastrService.success("Recordd successfully updated.");
    } catch (err) {}
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
          fs_licensed_id: this.id,
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

  title = "Edit Licensed Information";

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
      this.getUserService();
      this.techs = await this.licensedTechsService.find({
        fs_licensed_id: this.id,
      });
      this.licensed_techs = this.techs.map((s) => s.user_id);
    } catch (err) {}
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
