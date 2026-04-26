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
import { EventModalService } from "../event/event-modal/event-modal.component";
import { TokenStorageService } from "@app/core/services/token-storage.service";
import { JobModalCreateService } from "../../job/job-modal-create/job-modal-create.component";
import { EventMenuModalService } from "../tech-schedule/event-menu-modal/event-menu-modal.component";
import { EventModalCreateService } from "../event/event-modal-create/event-modal-create.component";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";

interface MiniCalendarDay {
  date: Date;
  day: number;
  currentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule,
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
      this.start = params["start"]
        ? moment(params["start"], "YYYY-MM-DD").toDate()
        : new Date();
      this.currentView = params["currentView"] || this.currentView;
    });
  }

  query = "";

  notifyParent($event) {
    this.id = $event?.id || null;
    this.start = $event?.request_date
      ? moment($event.request_date, "YYYY-MM-DD").toDate()
      : new Date();
    this.router.navigate(["/field-service/scheduling/calendar"], {
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
  calendarDisplayView: "month" | "week" | "day" = "month";
  miniCalendarDate: Date = new Date();
  selectedMiniDate: Date | null = null;
  selectedServiceTypes: string[] = [];
  selectedTechs: string[] = [];
  availableServiceTypes: string[] = [];
  availableTechs: string[] = [];
  set(d) {
    this.currentView = d;
    this.myEvents = [];
    const newEvents = [];

    this.router.navigate(["/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        currentView: this.currentView,
      },
    });

    for (const value of this.data) {
      if (!this.matchesAdditionalFilters(value)) {
        continue;
      }

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

    this.myEvents = newEvents;
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  id;
  previousId;
  start: Date = new Date();
  myEvents: MbscCalendarEvent[] | any = [];
  view = "month";

  get totalEvents(): number {
    return this.myEvents?.length || 0;
  }

  get confirmedEvents(): number {
    return (this.data || []).filter((row) => row.status === "Confirmed").length;
  }

  get jobEvents(): number {
    return (this.data || []).filter((row) => row.type_of_event === "JOB").length;
  }

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
      this.router.navigate(["/field-service/scheduling/calendar"], {
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
      this.availableServiceTypes = this.extractServiceTypes(data);
      this.availableTechs = this.extractTechs(data);
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
    // this.router.navigate(['/field-service/scheduling/calendar'], {
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

  currentMiniMonth(): string {
    return this.miniCalendarDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  miniCalendarDays(): MiniCalendarDay[] {
    const currentMonth = this.miniCalendarDate.getMonth();
    const currentYear = this.miniCalendarDate.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    const days: MiniCalendarDay[] = [];

    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth, -i);
      days.push(this.createMiniCalendarDay(prevDate, false));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push(this.createMiniCalendarDay(date, true));
    }

    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      days.push(this.createMiniCalendarDay(nextDate, false));
    }

    return days;
  }

  previousMonth(): void {
    this.miniCalendarDate = new Date(
      this.miniCalendarDate.getFullYear(),
      this.miniCalendarDate.getMonth() - 1,
      1
    );
  }

  nextMonth(): void {
    this.miniCalendarDate = new Date(
      this.miniCalendarDate.getFullYear(),
      this.miniCalendarDate.getMonth() + 1,
      1
    );
  }

  selectMiniDate(day: MiniCalendarDay): void {
    this.selectedMiniDate = day.date;
    this.start = new Date(day.date);
    this.refreshCurrentView();

    this.router.navigate(["/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        start: moment(this.start).format("YYYY-MM-DD"),
        id: null,
      },
    });
  }

  currentViewTitle(): string {
    const date = moment(this.start || new Date()).format("MMM D, YYYY");
    const viewLabel = this.calendarDisplayView.charAt(0).toUpperCase() + this.calendarDisplayView.slice(1);
    return `${viewLabel} View - ${date}`;
  }

  switchCalendarView(viewType: "month" | "week" | "day") {
    this.calendarDisplayView = viewType;

    switch (viewType) {
      case "month":
        this.calView = {
          calendar: { labels: "all" },
        };
        break;
      case "week":
        this.calView = {
          schedule: { type: "week" },
        };
        break;
      case "day":
        this.calView = {
          schedule: { type: "day" },
        };
        break;
    }
  }

  navigateDate(direction: "prev" | "next") {
    const currentDate = moment(this.start || new Date());
    const unit =
      this.calendarDisplayView === "day"
        ? "day"
        : this.calendarDisplayView === "week"
          ? "week"
          : "month";

    const newDate =
      direction === "prev" ? currentDate.subtract(1, unit) : currentDate.add(1, unit);

    this.router.navigate(["/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        start: newDate.format("YYYY-MM-DD"),
        id: null,
      },
    });
  }

  goToToday() {
    this.router.navigate(["/field-service/scheduling/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        start: moment().format("YYYY-MM-DD"),
        id: null,
      },
    });
  }

  refreshCurrentView() {
    if (this.inst) {
      const firstDay = this.inst._firstDay;
      const lastDay = this.inst._lastDay;
      if (firstDay && lastDay) {
        this.getData(firstDay, lastDay, false);
      }
    }
  }

  createEvent() {
    let modalRef1 = this.eventMenuModalService.open();
    modalRef1.result.then(
      (result) => {
        if (result == "event") {
          this.onEventEventCreate({ event: { start: new Date() }, inst: this.inst });
        } else if (result == "job") {
          const _data = {
            request_date: moment().format("YYYY-MM-DD"),
            created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
            created_by: this.tokenStorageService.authUser.id,
          };

          let modalRef = this.jobModalCreateService.open({ job: _data });
          modalRef.result.then(
            () => {
              this.refreshCurrentView();
            },
            () => {}
          );
        }
      },
      () => {}
    );
  }

  toggleServiceTypeFilter(serviceType: string) {
    if (this.selectedServiceTypes.includes(serviceType)) {
      this.selectedServiceTypes = this.selectedServiceTypes.filter((item) => item !== serviceType);
    } else {
      this.selectedServiceTypes = [...this.selectedServiceTypes, serviceType];
    }

    this.set(this.currentView);
  }

  toggleTechFilter(tech: string) {
    if (this.selectedTechs.includes(tech)) {
      this.selectedTechs = this.selectedTechs.filter((item) => item !== tech);
    } else {
      this.selectedTechs = [...this.selectedTechs, tech];
    }

    this.set(this.currentView);
  }

  clearServiceTypeFilters() {
    this.selectedServiceTypes = [];
    this.set(this.currentView);
  }

  clearTechFilters() {
    this.selectedTechs = [];
    this.set(this.currentView);
  }

  private matchesAdditionalFilters(row: any): boolean {
    const rowServiceType = String(row?.service_type || "").trim();
    const rowTechs = this.parseTechList(row?.techs);

    const matchesServiceType =
      !this.selectedServiceTypes.length ||
      (rowServiceType.length > 0 && this.selectedServiceTypes.includes(rowServiceType));

    const matchesTech =
      !this.selectedTechs.length ||
      rowTechs.some((tech) => this.selectedTechs.includes(tech));

    return matchesServiceType && matchesTech;
  }

  private extractServiceTypes(rows: any[]): string[] {
    const values = new Set<string>();

    for (const row of rows || []) {
      const serviceType = String(row?.service_type || "").trim();
      if (serviceType.length) {
        values.add(serviceType);
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  private extractTechs(rows: any[]): string[] {
    const values = new Set<string>();

    for (const row of rows || []) {
      for (const tech of this.parseTechList(row?.techs)) {
        values.add(tech);
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  private parseTechList(value: unknown): string[] {
    if (typeof value !== "string" || !value.trim().length) {
      return [];
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private createMiniCalendarDay(date: Date, currentMonth: boolean): MiniCalendarDay {
    const today = new Date();
    const selectedDate = this.selectedMiniDate || (this.start ? new Date(this.start) : null);
    const dayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isToday =
      dayDate.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const isSelected =
      !!selectedDate &&
      dayDate.getTime() ===
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    const hasEvents = (this.myEvents || []).some((event) => {
      const eventDate = moment(event.start).toDate();
      return (
        new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime() ===
        dayDate.getTime()
      );
    });

    return {
      date: dayDate,
      day: date.getDate(),
      currentMonth,
      isToday,
      isSelected,
      hasEvents,
    };
  }

  @ViewChild("myTimeline")
  inst: MbscEventcalendar;

  goBack = () => {
    this.id = null;
    this.ticketId = null;
    this.router.navigate(["/field-service/scheduling/calendar"], {
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
