import { Component, Input, OnInit, SimpleChanges } from "@angular/core";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { JobService } from "@app/core/api/field-service/job.service";
import { TeamService } from "@app/core/api/field-service/fs-team.service";
import { NAVIGATION_ROUTE } from "../../job-constant";
import { JobFormComponent } from "../../job-form/job-form.component";
import moment from "moment";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { ToastrService } from "ngx-toastr";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent, NgbDropdownModule],
  selector: "app-job-info",
  templateUrl: "./job-info.component.html",
  styleUrls: [],
})
export class JobInfoComponent implements OnInit {
  constructor(
    private router: Router,
    private jobService: JobService,
    private teamService: TeamService,
    private fb: FormBuilder,
    private authenticationService: AuthenticationService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes["id"]) {
      this.id = changes["id"].currentValue;
      this.getData();
    }
  }

  title = "Info";

  isLoading = false;

  form: FormGroup;

  @Input() id = null;

  submitted: boolean = false;

  goBackUrl;
  @Input() goBack: Function = (id?) => {
    if (this.goBackUrl) {
      this.router.navigateByUrl(this.goBackUrl);
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], {
        queryParamsHandling: "merge",
      });
    }
  };

  onSubmit = async () => {
    this.submitted = true;

    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors();
      return;
    }

    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  };

  async create() {
    try {
      this.isLoading = true;
      let { insertId } = await this.jobService.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully created");
      this.goBack(insertId);
    } catch (err) {
      this.isLoading = false;
    }
  }

  async update() {
    try {
      this.isLoading = true;
      await this.jobService.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  data: any;

  teams: FormArray;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.jobService.getById(this.id);

      let teams = await this.teamService.find({ fs_det_id: this.id });

      (this.form.controls["resource"] as FormArray).clear();

      if (teams) {
        this.teams = this.form.get("resource") as FormArray;
        for (let i = 0; i < teams.length; i++) {
          this.teams.push(this.fb.group(teams[i]));
        }
      }

      this.form.patchValue(
        {
          job: this.data,
        },
        { emitEvent: false }
      );

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  setOnRemoveTech($event) {
    this.teams.removeAt($event.index);
  }

  print() {
    setTimeout(() => {
      var printContents = document.getElementById("print").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();

      popupWin.document.write(`
        <html>
          <head>
            <title>Material Request Picking</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <style>
            @page {
              size: portrait;
              padding: 5 !important;
            }
            </style>
          </head>
          <body onload="window.print();window.close()">${printContents}</body>
        </html>`);

      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  }

  duplicate() {
    this.id = null;

    /**
     * If Duplicate is selected, clear the following fields.
     * If Billable is set to No, dont clear value.
     */
    this.form.patchValue({
      job: {
        invoice_date: "",
        vendor_inv_number: "",
        vendor_cost: "",
        invoice_number:
          this.form.value.job.billable == "No"
            ? this.form.value.job.billable
            : "",
        invoice_notes: "",
        invoice: "",
        acc_status: "",
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
        paper_work_location: "Field Service",
        billable_flat_rate_or_po: "",
        contractor_inv_sent_to_ap: "",
        period: "",
        customer_cancelled: "",
        cancellation_comments: "",
        cancelled_type: "",
      },
    });

    this.form.enable();
  }
}
