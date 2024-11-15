import { ChangeDetectorRef, Component, OnInit, ViewChild } from "@angular/core";
import { SchedulerService } from "@app/core/api/field-service/scheduler.service";
import { SharedModule } from "@app/shared/shared.module";
import {
  MbscCalendarEvent,
  MbscEventcalendar,
  MbscEventcalendarOptions,
  MbscEventcalendarView,
  MbscModule,
  setOptions,
} from "@mobiscroll/angular";
import moment from "moment";
import { JobModalService } from "../../job/job-modal-edit/job-modal.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { RootReducerState } from "@app/store";
import { JobOverviewComponent } from "../../job/job-overview/job-overview.component";
import { EventModalService } from "../event/event-modal/event-modal.component";
import { TicketOverviewComponent } from "../../ticket/ticket-overview/ticket-overview.component";
import { TokenStorageService } from "@app/core/services/token-storage.service";
import { JobModalCreateService } from "../../job/job-modal-create/job-modal-create.component";
import { JobEditComponent } from "../../job/job-edit/job-edit.component";
import { EventMenuModalService } from "../tech-schedule/event-menu-modal/event-menu-modal.component";
import { EventModalCreateService } from "../event/event-modal-create/event-modal-create.component";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule,
    JobOverviewComponent,
    TicketOverviewComponent,
    JobEditComponent,
    JobSearchComponent,
  ],
  selector: "app-calendar",
  templateUrl: "./calendar.component.html",
  styleUrls: ["./calendar.component.scss"],
})
export class CalendarComponent implements OnInit {
  constructor(
    private achedulerService: SchedulerService,
    public router: Router,
    private store: Store<RootReducerState>,
    private activatedRoute: ActivatedRoute,
    private cdref: ChangeDetectorRef,
    private eventModalService: EventModalService,
    private tokenStorageService: TokenStorageService,
    private jobModalCreateService: JobModalCreateService,
    private jobModalEditService: JobModalService,
    private eventMenuModalService: EventMenuModalService,
    private eventModalCreateService: EventModalCreateService
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.previousId = params["previousId"];
      this.start = params["start"];
      this.currentView = params["currentView"] || this.currentView;
    });
  }

  query = "";

  notifyParent($event) {
    this.id = $event?.id || null;
    this.start = $event.request_date;
    this.router.navigate(["/dashboard/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        start: moment(this.start).format("YYYY-MM-DD"),
        id: this.id,
      },
    });

    this.jumpToCell(this.id);
  }

  mySelectedEvent: MbscCalendarEvent[] = [];

  currentView = "ALL";
  set(d) {
    this.currentView = d;
    this.myEvents = [];
    const newEvents = [];

    this.router.navigate(["/dashboard/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        currentView: this.currentView,
      },
    });

    for (const value of this.data) {
      if (value.type_of_event == "JOB" && d == "JOBS") {
        let end = value.end == "All Day" ? value.start : value.end;
        newEvents.push({
          start: value.start,
          end: end,
          allDay: value.allDay,
          title: value.title,
          color: value.backgroundColor,
          id: value.id,
          type_of_event: value.type_of_event,
          textColor: value.textColor,
          tooltip: `FSID: ${value.id} \n${value.title} \n${
            value.property || ""
          } \n${value.techs || ""}`,
          cssClass: value.acc_status == "INVOICED" ? "line-through" : "",
        });
      } else if (value.type_of_event == "EVENT" && d == "EVENTS") {
        let end = value.end == "All Day" ? value.start : value.end;
        newEvents.push({
          start: value.start,
          end: end,
          allDay: value.allDay,
          title: value.title,
          color: value.backgroundColor,
          id: value.id,
          type_of_event: value.type_of_event,
          textColor: value.textColor,
          tooltip: `FSID: ${value.id} \n${value.title} \n${
            value.property || ""
          } \n${value.techs || ""}`,
          cssClass: value.acc_status == "INVOICED" ? "line-through" : "",
        });
      } else if (value.status == "Confirmed" && d == "CONFIRMED") {
        let end = value.end == "All Day" ? value.start : value.end;
        newEvents.push({
          start: value.start,
          end: end,
          allDay: value.allDay,
          title: value.title,
          color: value.backgroundColor,
          id: value.id,
          type_of_event: value.type_of_event,
          textColor: value.textColor,
          tooltip: `FSID: ${value.id} \n${value.title} \n${
            value.property || ""
          } \n${value.techs || ""}`,
          cssClass: value.acc_status == "INVOICED" ? "line-through" : "",
        });
      } else if (d == "ALL") {
        let end = value.end == "All Day" ? value.start : value.end;
        newEvents.push({
          start: value.start,
          end: end,
          allDay: value.allDay,
          title: value.title,
          color: value.backgroundColor,
          id: value.id,
          type_of_event: value.type_of_event,
          textColor: value.textColor,
          tooltip: `FSID: ${value.id} \n${value.title} \n${
            value.property || ""
          } \n${value.techs || ""}`,
          cssClass: value.acc_status == "INVOICED" ? "line-through" : "",
        });
      }
    }

    console.log(newEvents)
    this.myEvents = newEvents;
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  id;
  previousId;
  start;
  myEvents: MbscCalendarEvent[] | any = [];
  view = "month";

  calView: MbscEventcalendarView = {
    calendar: {
      labels: "all",
    },
  };

  eventSettings: MbscEventcalendarOptions = {
    clickToCreate: true,
    dragToCreate: false,
    dragToMove: false,
    dragToResize: false,
    eventDelete: false,
    view: {
      schedule: { type: "day" },
    },
    onSelectedDateChange: (e) => {
      this.router.navigate(["/dashboard/field-service/scheduling/calendar"], {
        queryParamsHandling: "merge",
        queryParams: {
          start: moment(e.date).format("YYYY-MM-DD"),
          id: null,
        },
      });
    },
    onPageLoading: async (args) => {
      this.getData(args.firstDay, args.lastDay);
    },
    onEventClick: (e) => {
      this.onEventClick(e);
    },
    onEventCreate: this.onEventCreate.bind(this),
  };

  data;
  isLoading = false;
  async getData(firstDay, lastDay, clearData = true) {
    if (clearData) this.myEvents = [];
    try {
      this.isLoading = true;
      let data: any = (this.data = await this.achedulerService.fsCalendar(
        moment(firstDay).format("YYYY-MM-DD"),
        moment(lastDay).format("YYYY-MM-DD")
      ));
      const newEvents = [];

      if (this.currentView) {
        this.set(this.currentView);
      } else {
        for (const value of data) {
          let end = value.end == "All Day" ? value.start : value.end;

          newEvents.push({
            start: value.start,
            end: end,
            allDay: value.allDay,
            title: value.title,
            color: value.backgroundColor,
            id: value.id,
            type_of_event: value.type_of_event,
            textColor: value.textColor,
            tooltip: `FSID: ${value.id} \n${value.title} \n${
              value.property || ""
            } \n${value.techs || ""}`,
          });
        }
        this.myEvents = newEvents;
      }

      this.jumpToCell(this.id);

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  jumpToCell(id) {
    setTimeout(() => {
      const el11: any = document.querySelectorAll(`.calendar-active`);
      if (el11) {
        for (let i = 0; i < el11.length; i++) {
          let row = el11[i];
          row.style.borderLeft = "unset";
          row.style.fontWeight = "unset";
        }
      }

      const el1: any = document.querySelector(`[ng-reflect-id="${id}"]`);

      if (el1) {
        el1.style.borderLeft = "5px solid red";
        el1.style.fontWeight = "800";
        el1.style.width = "80%";
        el1.classList.add("calendar-active");
        el1.scrollIntoView({ block: "center" });
      }
    }, 0);
  }

  onEventCreate(args) {
    let modalRef1 = this.eventMenuModalService.open();
    modalRef1.result.then(
      (result) => {
        if (result == "event") {
          this.onEventEventCreate(args);
        } else if (result == "job") {
          // this.id = data.event.id
          let _data = {
            request_date: moment(args.event.start).format("YYYY-MM-DD"),
            created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
            created_by: this.tokenStorageService.authUser.id,
          };

          let modalRef = this.jobModalCreateService.open({ job: _data });
          modalRef.result.then(
            (result: any) => {
              this.getData(args.inst._firstDay, args.inst._lastDay, false);
            },
            () => {
              this.myEvents = [...this.myEvents];
            }
          );
        }
      },
      () => {
        this.myEvents = [...this.myEvents];
      }
    );
  }

  onEventEventCreate(data) {
    let modalRef = this.eventModalCreateService.open({
      start: data.event.start,
      end: data.event.start,
      allDay: true,
    });
    modalRef.result.then(
      (result: Comment) => {
        this.getData(data.inst._firstDay, data.inst._lastDay, false);
      },
      () => {
        this.myEvents = [...this.myEvents];
      }
    );
  }

  onEventEventEdit(data) {
    let modalRef = this.eventModalService.open(data.event.id);
    modalRef.result.then(
      (result: Comment) => {
        this.getData(data.inst._firstDay, data.inst._lastDay, false);
      },
      () => {
        this.myEvents = [...this.myEvents];
      }
    );
  }

  onEventClick(data) {
    if (data.event.type_of_event == "EVENT") {
      if (data.event.id) {
        this.onEventEventEdit(data);
      } else {
        this.onEventEventCreate(data);
      }
      return;
    }

    // this.id = data.event.id
    let modalRef = this.jobModalEditService.open(data.event.id);
    modalRef.result.then(
      (result: any) => {
        this.getData(data.inst._firstDay, data.inst._lastDay, false);
      },
      () => {
        this.myEvents = [...this.myEvents];
      }
    );

    // this.id = data.event.id;
    // this.previousId = data.event.id;
    // this.router.navigate(['/dashboard/field-service/scheduling/calendar'], {
    //   queryParamsHandling: 'merge',
    //   queryParams: {
    //     id: data.event.id,
    //     start: moment(data.date).format('YYYY-MM-DD'),
    //     previousId: data.event.id,
    //   }
    // });
  }

  ngOnInit(): void {
    this.store.select("layout").subscribe((data) => {
      setOptions({
        theme: "ios",
        themeVariant: data.LAYOUT_MODE,
      });
    });
  }

  @ViewChild("myTimeline")
  inst: MbscEventcalendar;

  goBack = () => {
    this.id = null;
    this.ticketId = null;
    this.router.navigate(["/dashboard/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        id: null,
        ticketId: null,
      },
    });
  };

  ticketId = null;
  showTicket = (id) => {
    this.id = null;
    this.ticketId = id;
  };
}
