import { Component, inject, TemplateRef } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { AuthenticationService } from "@app/core/services/auth.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import moment from "moment";
import { TimeTrackerService } from "@app/core/api/time-tracker/time-tracker.service";
import { time_now } from "src/assets/js/util/time-now";
import { TimeTrackerDetailService } from "@app/core/api/time-tracker-detail/time-tracker-detail.service";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-time-tracker",
  templateUrl: "./time-tracker.component.html",
  styleUrls: ["./time-tracker.component.scss"],
})
export class TimeTrackerComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VehicleService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService,
    private timeTrackerService: TimeTrackerService,
    private timeTrackerDetailService: TimeTrackerDetailService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      if (this.id) {
        this.getData();
        this.getDetails();
      }
    });
  }

  data: any;
  async getData() {
    this.data = await this.timeTrackerService.getById(this.id);

    if (!this.data) {
      this.goBack();
    }
  }

  goBack() {
    this.router.navigate(["/operations/forms/time-tracker"], {
      relativeTo: this.activatedRoute,
      queryParams: { id: null },
    });
  }

  async getDetails() {
    this.times = await this.timeTrackerDetailService.find({
      time_tracker_id: this.id,
    });
  }

  start_time = "";
  end_time = "";
  name = "";
  time_tracker_title = "";

  id = 0;
  async start() {
    let data = await this.timeTrackerService.create({
      title: this.name,
      created_by: this.authenticationService.currentUserValue.id,
      created_by_name: this.authenticationService.currentUserValue.full_name,
      created_date: time_now(),
    });
    this.id = data.insertId;

    this.router.navigate(["/operations/forms/time-tracker"], {
      relativeTo: this.activatedRoute,
      queryParams: { id: this.id },
    });
    this.getData();
  }

  completed = [];

  private offcanvasService = inject(NgbOffcanvas);

  openBottom(content: TemplateRef<any>) {
    this.start_time = moment().format("YYYY-MM-DD HH:mm");
    this.end_time = "";
    this.name = "";
    this.offcanvasService
      .open(content, {
        ariaLabelledBy: "offcanvas-basic-title",
        position: "bottom",
      })
      .result.then(
        async (result) => {
          let data = {
            title: result.name,
            time_tracker_id: this.id,
            start_time: moment(result.start_time).format("YYYY-MM-DD HH:mm"),
            end_time: moment(result.end_time).format("YYYY-MM-DD HH:mm"),
            created_by: this.authenticationService.currentUserValue.id,
            created_date: time_now(),
          };

          await this.timeTrackerDetailService.create(data);

          this.start_time = result.end_time;
          this.end_time = "";
          this.name = "";
          await this.getDetails();
        },
        (reason) => {}
      );
  }

  edit_id = null;
  edit(content: TemplateRef<any>, row) {
    this.name = row.title;
    this.start_time = row.start_time;
    this.end_time = row.end_time;
    this.edit_id = row.id;
    this.offcanvasService
      .open(content, {
        ariaLabelledBy: "offcanvas-basic-title",
        position: "bottom",
      })
      .result.then(
        async (result) => {
          let data = {
            title: result.name,
            time_tracker_id: this.id,
            start_time: moment(result.start_time).format("YYYY-MM-DD HH:mm"),
            end_time: moment(result.end_time).format("YYYY-MM-DD HH:mm"),
          };
          await this.timeTrackerDetailService.update(row.id, data);

          this.start_time = row.end_time;
          this.end_time = "";
          this.name = "";
          this.edit_id = "";
          await this.getDetails();
        },
        (reason) => {
          this.edit_id = "";
        }
      );
  }

  async onDelete() {
    await this.timeTrackerDetailService.delete(this.edit_id);
    this.offcanvasService.dismiss();
    await this.getDetails();
  }

  save() {
    // this.offcanvas.close();
  }

  async onDeleteMain() {
    if (!confirm("Are you sure you want to delete?")) return;
    await this.timeTrackerService.delete(this.data?.id);

    this.goBack();

    await this.getData();
  }

  getTotalTime(start, end) {
    const formatString = "YYYY-MM-DD HH:mm:ss";

    const isValidStart = moment(start, formatString).isValid();
    const isValidEnd = moment(end, formatString).isValid();

    if (!isValidStart || !isValidEnd) return 0;

    const duration = moment.duration(moment(end).diff(moment(start)));

    //Get Days
    const days = Math.floor(duration.asDays()); // .asDays returns float but we are interested in full days only
    const daysFormatted = days ? `${days}d ` : ""; // if no full days then do not display it at all

    //Get Hours
    const hours = duration.hours();
    const hoursFormatted = `${hours}h `;

    //Get Minutes
    const minutes = duration.minutes();
    const minutesFormatted = `${minutes}m`;

    return [daysFormatted, hoursFormatted, minutesFormatted].join("");
  }

  times = [];

  async finish() {
    let now = time_now();
    await this.timeTrackerService.update(this.id, {
      completed_date: now,
    });

    this.data.completed_date = now;

    await this.getData();

    this.times = [];
    this.time_tracker_title = "";
  }

  // Helper method to get total session time
  getTotalSessionTime(): string {
    if (!this.times || this.times.length === 0) return "0m";
    
    let totalMinutes = 0;
    this.times.forEach(entry => {
      const start = moment(entry.start_time);
      const end = moment(entry.end_time);
      if (start.isValid() && end.isValid()) {
        totalMinutes += end.diff(start, 'minutes');
      }
    });
    
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  // Helper method to get session total time for completed sessions
  getSessionTotalTime(session: any): string {
    if (!session.times || session.times.length === 0) return "0m";
    
    let totalMinutes = 0;
    session.times.forEach((entry: any) => {
      const start = moment(entry.start_time);
      const end = moment(entry.end_time);
      if (start.isValid() && end.isValid()) {
        totalMinutes += end.diff(start, 'minutes');
      }
    });
    
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }
}
