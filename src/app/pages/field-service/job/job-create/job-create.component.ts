import { Component, Input, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { JobFormComponent } from "../job-form/job-form.component";
import { NAVIGATION_ROUTE } from "../job-constant";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { JobService } from "@app/core/api/field-service/job.service";
import { FormArray, FormGroup } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent],
  selector: "app-job-create",
  templateUrl: "./job-create.component.html",
  styleUrls: [],
})
export class JobCreateComponent implements OnInit {
  constructor(
    private router: Router,
    private api: JobService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  title = "Create Job";

  isLoading = false;

  form: FormGroup;

  submitted: boolean = false;

  @Input() goBack: Function = (id?: number) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
      queryParams: { id },
    });
  };

  setFormElements = async ($event) => {
    this.form = $event;
    this.form.patchValue(
      {
        job: {
          created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
          created_by: this.authenticationService.currentUserValue.id,
        },
      },
      { emitEvent: false }
    );
  };
  @Input() ngStyle = { height: "calc(100vh - 254px   )" };

  onSubmit = async () => {
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
      this.goBack(insertId);
    } catch (err) {
      this.isLoading = false;
    }
  };

  teams: FormArray;
  removeTech = ($event) => {
    this.teams.removeAt($event.index);
  };
}
