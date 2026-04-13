import { ChangeDetectorRef, Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
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
  styleUrls: ["./calendar.component.scss"],
})
export class CalendarComponent implements OnInit, AfterViewInit {
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
      this.start = params["start"] || moment().format("YYYY-MM-DD");
    });
  }

  ngAfterViewInit() {
    // Component is ready after view initialization
  }

  id;
  previousId;
  start;
  myEvents: MbscCalendarEvent[] | any = [];
  filteredEvents: MbscCalendarEvent[] | any = [];
  view = "month";
  currentView = "month";

  // Event statistics
  totalEvents = 0;
  pendingEvents = 0;
  completedEvents = 0;

  // Filters
  filters = {
    showAll: true,
    showScheduler: true,
    showOther: true
  };

  calView: MbscEventcalendarView = {
    calendar: {
      labels: "all",
    },
  };

  eventSettings: MbscEventcalendarOptions = {
    clickToCreate: true,
    dragToCreate: false,
    dragToMove: true,
    dragToResize: true,
    eventDelete: true,
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
    onEventUpdate: this.onEventUpdate.bind(this),
    onEventDelete: this.onEventDelete.bind(this),
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
    this.updateEventStats();
    this.applyFilters();
    this.getAttribut();
  }

  updateEventStats() {
    this.totalEvents = this.myEvents.length;
    this.completedEvents = this.myEvents.filter(event => event.cssClass === 'strike-class').length;
    this.pendingEvents = this.totalEvents - this.completedEvents;
  }

  applyFilters() {
    if (this.filters.showAll) {
      this.filteredEvents = [...this.myEvents];
      // When "All" is selected, uncheck individual filters
      this.filters.showScheduler = false;
      this.filters.showOther = false;
    } else {
      this.filteredEvents = this.myEvents.filter(event => {
        if (this.filters.showScheduler && event.type_of_event === 'fs_scheduler') return true;
        if (this.filters.showOther && event.type_of_event !== 'fs_scheduler') return true;
        return false;
      });
      
      // If no individual filters are selected, show nothing
      if (!this.filters.showScheduler && !this.filters.showOther) {
        this.filteredEvents = [];
      }
    }
  }

  onFilterChange(filterType: string) {
    if (filterType === 'all' && this.filters.showAll) {
      // When All is selected, uncheck others
      this.filters.showScheduler = false;
      this.filters.showOther = false;
    } else if (filterType !== 'all') {
      // When individual filter is selected, uncheck All
      this.filters.showAll = false;
    }
    this.applyFilters();
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

  onEventUpdate(args) {
    // Handle drag & drop updates
    console.log('Event updated:', args);
    // You can add API call here to update the event on the server
  }

  onEventDelete(args) {
    // Handle event deletion
    console.log('Event deleted:', args);
    // You can add API call here to delete the event from the server
  }

  // New productivity methods
  createEvent() {
    const today = moment().format("YYYY-MM-DD");
    let _data = {
      start_date: today,
      end_date: today,
      created_by: this.authenticationService.currentUserValue.id,
    };
    const modalRef = this.calendarModalCreateService.open(_data);
    modalRef.result
      .then(async (result) => {
        // Refresh current view
        this.refreshCurrentView();
      })
      .catch(() => {});
  }

  switchView(viewType: string) {
    this.currentView = viewType;
    this.view = viewType;
    
    // Update calendar view configuration
    switch(viewType) {
      case 'month':
        this.calView = {
          calendar: { labels: "all" }
        };
        break;
      case 'week':
        this.calView = {
          schedule: { type: "week" }
        };
        break;
      case 'day':
        this.calView = {
          schedule: { type: "day" }
        };
        break;
    }
  }

  navigateDate(direction: 'prev' | 'next') {
    const currentDate = moment(this.start || new Date());
    let newDate;
    
    if (direction === 'prev') {
      newDate = currentDate.subtract(1, this.currentView === 'day' ? 'day' : 
                                    this.currentView === 'week' ? 'week' : 'month');
    } else {
      newDate = currentDate.add(1, this.currentView === 'day' ? 'day' : 
                               this.currentView === 'week' ? 'week' : 'month');
    }
    
    this.router.navigate(["/operations/logistics/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        start: newDate.format("YYYY-MM-DD"),
      },
    });
  }

  goToToday() {
    const today = moment().format("YYYY-MM-DD");
    this.router.navigate(["/operations/logistics/calendar"], {
      queryParamsHandling: "merge",
      queryParams: {
        start: today,
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

    // Add keyboard shortcuts for better productivity
    this.setupKeyboardShortcuts();
  }

  setupHoverEffects() {
    // Add hover effects with a slight delay to ensure DOM is ready
    setTimeout(() => {
      this.addCalendarHoverEffects();
    }, 500);
  }

  addCalendarHoverEffects() {
    const style = document.createElement('style');
    style.textContent = `
      .mbsc-calendar .mbsc-cal-day:hover::after,
      .mbsc-calendar .mbsc-calendar-cell:hover::after,
      .mbsc-schedule .mbsc-schedule-time:hover::after {
        content: '+' !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #667eea !important;
        color: white !important;
        width: 26px !important;
        height: 26px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 16px !important;
        font-weight: bold !important;
        z-index: 1000 !important;
        animation: plusBounce 0.3s ease !important;
        pointer-events: none !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important;
      }
      
      @keyframes plusBounce {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      
      /* Fallback for any calendar cell */
      .mbsc-calendar div:hover::after {
        content: '+' !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #667eea !important;
        color: white !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        z-index: 1000 !important;
        pointer-events: none !important;
        box-shadow: 0 3px 8px rgba(0,0,0,0.2) !important;
      }
    `;
    
    if (!document.head.querySelector('#calendar-hover-style')) {
      style.id = 'calendar-hover-style';
      document.head.appendChild(style);
    }
  }

  setupCalendarHoverListeners() {
    // Add event listeners to calendar elements
    const calendarContainer = document.querySelector('.mbsc-calendar, .mbsc-schedule');
    if (calendarContainer) {
      // Add hover class to show plus signs
      calendarContainer.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        if (this.isCalendarCell(target)) {
          this.showPlusSign(target);
        }
      });

      calendarContainer.addEventListener('mouseout', (e) => {
        const target = e.target as HTMLElement;
        if (this.isCalendarCell(target)) {
          this.hidePlusSign(target);
        }
      });
    }
  }

  isCalendarCell(element: HTMLElement): boolean {
    return element.classList.contains('mbsc-cal-day') ||
           element.classList.contains('mbsc-calendar-cell') ||
           element.classList.contains('mbsc-schedule-time') ||
           element.classList.contains('mbsc-calendar-day') ||
           (element.parentElement && element.parentElement.classList.contains('mbsc-cal-day'));
  }

  showPlusSign(element: HTMLElement) {
    // Remove any existing plus sign
    this.hidePlusSign(element);
    
    const plusSign = document.createElement('div');
    plusSign.className = 'calendar-plus-indicator';
    plusSign.innerHTML = '+';
    plusSign.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #667eea;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: plusPopIn 0.3s ease-out;
    `;

    // Make sure parent has relative positioning
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(plusSign);
  }

  hidePlusSign(element: HTMLElement) {
    const existingPlus = element.querySelector('.calendar-plus-indicator');
    if (existingPlus) {
      existingPlus.remove();
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch(event.key.toLowerCase()) {
        case 'n':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.createEvent();
          }
          break;
        case 't':
          event.preventDefault();
          this.goToToday();
          break;
        case 'm':
          event.preventDefault();
          this.switchView('month');
          break;
        case 'w':
          event.preventDefault();
          this.switchView('week');
          break;
        case 'd':
          event.preventDefault();
          this.switchView('day');
          break;
        case 'arrowleft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.navigateDate('prev');
          }
          break;
        case 'arrowright':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.navigateDate('next');
          }
          break;
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.refreshCurrentView();
          }
          break;
      }
    });
  }

  exportCalendar() {
    // Export current view events to CSV
    const events = this.filteredEvents.map(event => ({
      title: event.text?.replace(/<[^>]*>/g, '') || 'No Title',
      start: moment(event.start).format('YYYY-MM-DD HH:mm'),
      end: moment(event.end).format('YYYY-MM-DD HH:mm'),
      type: event.type_of_event || 'general',
      status: event.cssClass === 'strike-class' ? 'Completed' : 'Pending'
    }));

    const csvContent = [
      ['Title', 'Start', 'End', 'Type', 'Status'],
      ...events.map(event => [event.title, event.start, event.end, event.type, event.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-${moment().format('YYYY-MM-DD')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  printCalendar() {
    window.print();
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
