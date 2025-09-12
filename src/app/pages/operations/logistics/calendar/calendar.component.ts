import { ChangeDetectorRef, Component, OnInit, ViewChild } from "@angular/core";
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
import { _compressToEncodedURIComponent } from "src/assets/js/util/jslzString";
import { ActivatedRoute, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { RootReducerState } from "@app/store";
import { ReceivingService } from "@app/core/api/receiving/receiving.service";
import { CalendarModalCreateService } from "./calendar-modal-create/calendar-modal-create.component";
import { AuthenticationService } from "@app/core/services/auth.service";
import { CalendarModalEditService } from "./calendar-modal-edit/calendar-modal-edit.component";

@Component({
  standalone: true,
  imports: [SharedModule, MbscModule],
  selector: "app-calendar",
  templateUrl: "./calendar.component.html",
  styleUrls: [],
})
export class CalendarComponent implements OnInit {
  constructor(
    private achedulerService: ReceivingService,
    public router: Router,
    private store: Store<RootReducerState>,
    private activatedRoute: ActivatedRoute,
    private cdref: ChangeDetectorRef,
    private calendarModalEditService: CalendarModalEditService,
    private calendarModalCreateService: CalendarModalCreateService,
    private authenticationService: AuthenticationService
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.previousId = params["previousId"];
      this.start = params["start"];
    });
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
      this.router.navigate(["/operations/logistics/calendar"], {
        queryParamsHandling: "merge",
        queryParams: {
          start: moment(e.date).format("YYYY-MM-DD"),
        },
      });
    },
    onPageLoading: async (args) => {
      this.getData(args.firstDay, args.lastDay);
    },
    onEventClick: this.onEventClick.bind(this),
    onEventCreate: this.onEventCreate.bind(this),
  };

  async getData(firstDay, lastDay, clearData = true) {
    if (clearData) this.myEvents = [];
    let data: any = await this.achedulerService.getData(
      moment(firstDay).format("YYYY-MM-DD"),
      moment(lastDay).format("YYYY-MM-DD")
    );
    const newEvents = [];

    for (const value of data) {
      let end = value.end == "All Day" ? value.start : value.end;
      newEvents.push({
        start: value.start,
        end: end,
        allDay: value.allDay,
        // title: value.title,
        text: `<span style="color:${value.text_color}">${value.title}</span>`,
        color: value.background_color,
        id: value.id,
        type_of_event: value.type_of,
        textColor: value.text_color,
        cssClass: value.status == "Completed" ? "strike-class" : null,
      });
    }
    this.myEvents = newEvents;
    this.getAttribut();
  }

  getAttribut() {
    setTimeout(() => {
      const el1: any = document.querySelector(
        `[ng-reflect-id="${this.previousId}"]`
      );

      if (el1) {
        el1.style.borderLeft = "3px solid red";
        //el1.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el1.scrollIntoView({ block: "center" });
      }
    }, 0);
  }

  onEventCreate(args) {
    let _data = {
      start_date: moment(args.event.start).format("YYYY-MM-DD"),
      end_date: moment(args.event.end).format("YYYY-MM-DD"),
      created_by: this.authenticationService.currentUserValue.id,
    };
    const modalRef = this.calendarModalCreateService.open(_data);
    modalRef.result
      .then(async (result) => {
        this.getData(args.inst._firstDay, args.inst._lastDay, false);
      })
      .catch(() => {
        this.myEvents = [...this.myEvents];
      });
  }

  onEventEventCreate(data) {}

  onEventClick(args) {
    this.previousId = args.event.id;
    this.router.navigate(["/operations/logistics/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        previousId: args.event.id,
      },
    });

    if (args.event.type_of_event == "fs_scheduler") {
      this.print(args?.event, args?.date);
    } else {
      const modalRef = this.calendarModalEditService.open(args.event.id);
      modalRef.result
        .then(async (result) => {
          this.getData(args.inst._firstDay, args.inst._lastDay, false);
        })
        .catch(() => {});
    }
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

  print = (data, start) => {
    var popupWin = window.open("", "_blank", "width=1000,height=600");
    popupWin.document.open();

    popupWin.document.write(`
      <html>
        <head>
          <title>FSID</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
        </head>
        <body onload="window.print();window.close()">
          Job Info
          <ul style="font-size:16px !important">
          <li>FSID: ${data?.extendedProps?.fs_scheduler_id} </li>
          <li>Title: ${data?.title} </li>
          <li>Customer: ${data?.extendedProps?.customer} </li>
          <li>Platform: ${data?.extendedProps?.platform} </li>
          <li>Property: ${data?.extendedProps?.property} </li>
          <li>Status: ${data?.extendedProps?.status} </li>
          <li>Sign Type: ${data?.extendedProps?.sign_type} </li>
          <li>Request Date: ${moment(start).format("lll")} </li>
          </ul>
        </body>
      </html>`);

    popupWin.document.close();

    popupWin.onfocus = function () {
      setTimeout(function () {
        this.hideForAgs = false;
        popupWin.focus();
        popupWin.document.close();
      }, 300);
    };
  };
}
