import { Component, Input, OnInit } from "@angular/core";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { JobFormComponent } from "../job-form/job-form.component";
import { ActivatedRoute, Router } from "@angular/router";
import { JobService } from "@app/core/api/field-service/job.service";
import { TeamService } from "@app/core/api/field-service/fs-team.service";
import { ToastrService } from "ngx-toastr";
import { SharedModule } from "@app/shared/shared.module";
import { getFormValidationErrors } from "src/assets/js/util";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { NAVIGATION_ROUTE } from "../../ticket/ticket-constant";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent, JobSearchComponent],
  selector: "app-job-edit",
  templateUrl: "./job-edit.component.html",
  styleUrls: [],
})
export class JobEditComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private jobService: JobService,
    private teamService: TeamService,
    private fb: FormBuilder,
    private toastrService: ToastrService,
    private WorkOrderService: WorkOrderService
  ) {}

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['id']) {
  //     this.id = changes['id'].currentValue
  //     this.getData();
  //   }
  // }

  @Input() ngStyle = { height: "calc(100vh - 262px  )" };

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.goBackUrl = params["goBackUrl"];
    });
    if (this.id) this.getData();
  }

  active = 1;

  @Input() showSearch = true;
  @Input() contentWidth = null;

  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate(this.goBackUrl);
    }
  };

  onGoBack() {
    this.data = null;
    this.id = null;
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: "merge" });
    } else {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: { id: this.id, active: 1 },
      });
    }
  }

  notifyParent($event) {
    if (!this.showSearch) return;
    this.id = $event.id;
    this.active = 1;
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: { id: this.id, active: 1 },
    });
    this.getData();
  }

  title = "Edit";

  isLoading = false;

  form: FormGroup;

  @Input() id = null;

  submitted: boolean = false;

  goBackUrl;

  onSubmit = async () => {
    this.submitted = true;

    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      await this.jobService.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  };

  viewAttachment(url) {
    window.open(url, "_blank");
  }

  data: any;

  teams: FormArray;

  ticketInfo;
  async getData() {
    if (this.teams?.length) {
      this.teams = this.form.get("resource") as FormArray;
      while (0 !== this.teams.length) {
        this.teams.removeAt(0);
      }
    }

    try {
      this.data = await this.jobService.getById(this.id);
      let teams = await this.teamService.find({ fs_det_id: this.id });
      this.ticketInfo = await this.WorkOrderService.findOne({
        fs_scheduler_id: this.id,
      });

      if (teams) {
        this.teams = this.form.get("resource") as FormArray;
        for (let i = 0; i < teams.length; i++) {
          let data = teams[i];
          this.teams.push(
            this.fb.group({
              user: data.user,
              fs_det_id: "",
              lead_tech: 0,
              id: data.id,
              contractor_code: null,
              title: data.title,
              user_id: data.user_id,
            })
          );
        }
      }

      this.form.patchValue(
        {
          job: this.data,
        },
        { emitEvent: false }
      );
    } catch (err) {}
  }

  viewTicket() {
    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: "merge",
      queryParams: {
        id: this.ticketInfo.id,
        goBackUrl: this.router.url,
      },
    });
  }

  onCancel() {
    this.goBack();
  }

  removeTech = async ($event, value) => {
    if (value.id) {
      const { value: accept } = await SweetAlert.confirm({
        title: "Are you sure you want to remove?",
        text: "",
      });
      if (!accept) return;
      await this.teamService.delete(value.id);
    }
    this.teams.removeAt($event);
  };
}
