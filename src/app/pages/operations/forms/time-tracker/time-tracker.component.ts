import { Component, inject, TemplateRef } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { AuthenticationService } from "@app/core/services/auth.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import moment from "moment";

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
    private api: VehicleService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) {}

  ngOnInit(): void {}

  start_time = "";
  end_time = "";
  name = "";
  time_tracker_title = "";

  id = 0;
  start() {
    this.id = this.id + 1;
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
        (result) => {
          this.times.push({
            name: result.name,
            start_time: moment(result.start_time).format("YYYY-MM-DD HH:mm"),
            end_time: moment(result.end_time).format("YYYY-MM-DD HH:mm"),
          });

          this.start_time = result.end_time;
          this.end_time = "";
          this.name = "";
        },
        (reason) => {}
      );
  }

  edit(content: TemplateRef<any>, row) {
    this.name = row.name;
    this.start_time = row.start_time;
    this.end_time = row.end_time;
    this.offcanvasService
      .open(content, {
        ariaLabelledBy: "offcanvas-basic-title",
        position: "bottom",
      })
      .result.then(
        (result) => {
          row.name = result.name;
          row.start_time = moment(result.start_time).format("YYYY-MM-DD HH:mm");
          row.end_time = moment(result.end_time).format("YYYY-MM-DD HH:mm");

          this.start_time = row.end_time;
          this.end_time = "";
          this.name = "";
        },
        (reason) => {}
      );
  }

  save() {
    // this.offcanvas.close();
  }

  times = [];

  finish() {
    this.completed.push({
      id: this.id,
      time_tracker_title: this.time_tracker_title,
      times: this.times,
    });
    this.times = [];
    this.id++;
    this.time_tracker_title = "";
  }
}
