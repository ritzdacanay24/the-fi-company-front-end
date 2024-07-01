import { CalendarEventService } from '@app/core/api/field-service/calendar-event.service';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MbscEventcalendarView, MbscCalendarEvent, MbscModule, MbscEventcalendarOptions, MbscEventcalendar, formatDate, setOptions, MbscResource, MbscPopup, MbscPopupOptions } from '@mobiscroll/angular';
import moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { TicketOverviewComponent } from '../../ticket/ticket-overview/ticket-overview.component';
import { JobOverviewComponent } from '../../job/job-overview/job-overview.component';
import { JobModalService } from '../../job/job-modal-edit/job-modal.service';
import { SharedModule } from '@app/shared/shared.module';
import { RootReducerState } from '@app/store';
import { Store } from '@ngrx/store';
import { EventModalService } from '../event/event-modal/event-modal.component';
import { JobModalCreateService } from '../../job/job-modal-create/job-modal-create.component';

import tippy from 'tippy.js';
import { EventMenuModalService } from './event-menu-modal/event-menu-modal.component';
import { EventModalCreateService } from '../event/event-modal-create/event-modal-create.component';
import { isArray } from 'lodash';
import { JobEditComponent } from '../../job/job-edit/job-edit.component';

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule,
    NgSelectModule,
    TicketOverviewComponent,
    JobOverviewComponent,
    JobEditComponent
  ],
  selector: 'app-resource-by-tech',
  templateUrl: `./tech-scheduler.component.html`,
  styleUrls: [`./tech-scheduler.component.scss`]
})
export class TechScheduleComponent implements OnInit {

  @ViewChild('popup', { static: false })
  tooltip!: MbscPopup;

  formatDate = formatDate;
  constructor(
    private api: SchedulerService,
    private cdref: ChangeDetectorRef,
    private router: Router,
    public activatedRoute: ActivatedRoute,
    private calendarEventService: CalendarEventService,
    private jobModalCreateService: JobModalCreateService,
    private store: Store<RootReducerState>,
    private eventModalService: EventModalService,
    private eventMenuModalService: EventMenuModalService,
    private eventModalCreateService: EventModalCreateService,
    private jobModalEditService: JobModalService
  ) { }

  ngAfterContentChecked() {
    this.cdref?.detectChanges();
  }

  @Input() ngStyle = { 'height': 'calc(100vh - 102px)' }
  @Input() submittedTickets = true

  ngOnInit(): void {
    this.store.select('layout').subscribe((data) => {
      setOptions({
        theme: 'ios',
        themeVariant: data.LAYOUT_MODE
      });
    })

  }

  @Input() condense = true

  ngOnChanges(changes: SimpleChanges) {
    if (changes['start']) {
      this.start = changes['start'].currentValue;
    }
    if (changes['id']) {
      this.id = changes['id'].currentValue;
      if (!this.id) this.clearEventOverlay()
      this.scrollTo()
    }
    if (changes['submittedTickets']) {
      this.submittedTickets = changes['submittedTickets'].currentValue
      this.runFilteredData()

    }

  }


  runFilteredData() {

    let newData: any = this.copiedEvents;

    let e = []
    for (let i = 0; i < newData?.length; i++) {
      if (!newData[i].dateSubmitted && !this.submittedTickets) {
        e.push(newData[i])
      }
    }

    if (!this.submittedTickets) {
      this.myEvents = e

    } else {
      this.myEvents = this.copiedEvents

    }
  }

  connectingJobs: any = []

  @ViewChild('calendar') calendarInstance: MbscEventcalendar;

  @Output() calenderEmitter: EventEmitter<any> = new EventEmitter();
  @Output() dateChangeEmitter: EventEmitter<any> = new EventEmitter();

  isLoading = false;

  myEvents: MbscCalendarEvent[] = [];
  myResources: MbscResource[] = [];

  @Input() view: MbscEventcalendarView = {
    timeline: {
      type: 'week',
      size: 5,
      eventList: true,
      maxEventStack: 'all',
      virtualScroll: true
      // resolutionVertical: 'day',
      //virtualScroll: true,
    },

  };

  currentView
  @Input() id = null
  workOrderId = null
  isStartFound: any;
  initalLoad = false;

  active = 1

  @Input() start: any;
  end: any;

  eventInstance: any
  onPageLoading = async (args: any) => {
    await this.getData(args.firstDay, args.lastDay)
  }


  myResourcesCount = 0
  allEmployees = []
  myInvalids = []
  copiedEvents
  async getData(firstDay, lastDay, clearData = true) {

    this.calendarOptions = {
      ...this.calendarOptions,
      colors: []
    }
    this.myInvalids = []

    if (clearData) this.myEvents = [];
    try {
      this.isLoading = true;
      const start = moment(firstDay).format('YYYY-MM-DD');
      const end = moment(lastDay).format('YYYY-MM-DD');

      let data: any = await this.api.fsTechCalendar(start, end);

      for (const event of data.info) {
        event.start = event.start ? event.start : event.start;
        event.end = event.end ? event.end : event.end;
        event.id = event.id
        event.techs = event.techs
        event.backgroundColor = event.backgroundColor
        event.dateSubmitted = event.dateSubmitted
        event.tooltip = `FSID: ${event.id} \n${event.title} \n${moment(event.start).format('HH:mm')} to ${moment(event.end).format('HH:mm')} \n${event.techs || ''}`

      }

      this.allEmployees = data.info1


      let contractors = [];
      let employeess = [];
      let inactive = [];
      let active = [];

      this.myResourcesCount = 0
      for (const event of data.info1) {
        if (event.active == 0) {
          inactive.push(event)
        } else if (event.title == 'Vendor') {
          this.myResourcesCount++
          contractors.push(event)
        } else if (event.active == 1 && event.access == 1 && event.title != 'Installer') {
          this.myResourcesCount++
          active.push(event)
        } else if (event.title == 'Installer') {
          this.myResourcesCount++
          employeess.push(event)
        } else {
          this.myResourcesCount++
          inactive.push(event)
        }
      }

      let resources = [
        {
          id: 'Unassigned',
          name: 'Unassigned',
          color: '#c8cdcf',
          fixed: true,
        }, {

          id: 'techs',
          name: 'Techs',
          collapsed: false,
          eventCreation: false,
          children: employeess,
        }, {
          id: 'active',
          name: 'Active',
          collapsed: false,
          eventCreation: false,
          children: active,
        }, {
          id: 'contractors',
          name: 'Contractors',
          collapsed: false,
          eventCreation: false,
          children: contractors,
        }, {
          id: 'inactive',
          name: 'Inactive',
          collapsed: true,
          eventCreation: false,
          children: inactive
        }]

      this.myEvents = data.info;

      this.copiedEvents = data.info;
      this.myResources = resources;

      this.runFilteredData()

      if (this.id && clearData)
        this.scrollTo();

      this.calendarOptions = {
        ...this.calendarOptions,
        colors: [{
          start: moment().startOf('day').format('YYYY-MM-DD'),
          end: moment().startOf('day').format('YYYY-MM-DD'),
          title: 'Available to book',
          cssClass: 'md-available-to-book-class text-center',
          recurring: {
            repeat: 'weekly',
            weekDays: 'MO,TU,WE,TH,FR',
          },
          resource: data.allUsers
        }]
      }

      this.myInvalids = [
        {
          start: '00:00',
          end: '23:59',
          recurring: {
            repeat: 'weekly',
            weekDays: 'SA,SU',
          },
          cssClass: 'md-lunch-break-class mbsc-flex',
        },
      ];
      this.calenderEmitter.emit(this.calendarInstance);

      this.isLoading = false;


    } catch (er) {
      this.isLoading = false;

    }
  }

  instances: any;
  event_id

  onCellClick = (args) => {
    this.clearEventOverlay()
    let modalRef = this.eventMenuModalService.open()
    modalRef.result.then((result) => {
      if (result == 'event') {
        this.onEventEventCreated(args)
      } else if (result == 'job') {
        this.onEventCreate(args)
      }

    }, () => { });
  }

  @Input() colors = []

  currentEvent

  viewFile() { }
  anchor?: HTMLElement;

  timer: any;
  popupOptions: MbscPopupOptions = {
    display: 'anchored',
    touchUi: false,
    showOverlay: false,
    contentPadding: false,
    closeOnOverlayClick: false,
    width: 350,
    scrollLock: true
  };

  mouseEnter(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  mouseLeave(): void {
    this.timer = setTimeout(() => {
      this.tooltip.close();
    }, 200);
  }

  @Input() calendarOptions: MbscEventcalendarOptions = {
    noEventsText: "To title set",
    colorEventList: true,
    clickToCreate: true,
    dragToCreate: false,
    dragToMove: false,
    dragToResize: false,
    eventDelete: false,
    showEventTooltip: false,
    onEventUpdated: this.onEventUpdated.bind(this),
    onEventClick: this.onEventClick.bind(this),
    onSelectedDateChange: this.onSelectedDateChange.bind(this),
    onEventCreate: this.onEventCreate.bind(this),
    onCellClick: this.onCellClick.bind(this),
    onEventHoverIn: (args: any, inst) => {

      const event: any = args.event;
      const resource: MbscResource = this.allEmployees.find((dr) => dr.id === event.resource)!;
      const time = formatDate('hh:mm A', new Date(event.start as string)) + ' - ' + formatDate('hh:mm A', new Date(event.end as string));


      this.currentEvent = event;
      this.currentEvent.time = time;

      const el1: any = document.querySelectorAll(`[id="${args.event.id}"]`);


      if (args.event.id && el1?.length > 1) {
        const love: any = document.querySelectorAll(`.md-timeline-template-event`);
        for (let i = 0; i < love.length; i++) {
          let row = love[i]
          row.classList.remove('opacity-100');
          //row.classList.add('opacity-75');
          row.style.borderLeft = "unset";
          row.style.fontWeight = "unset";
        };
        for (let i = 0; i < el1.length; i++) {
          let row = el1[i]

          row.classList.add('calendar-active');
          row.classList.add('opacity-100');
          row.style.borderLeft = "5px solid red";
          row.style.fontWeight = "400";
          row.style.paddingLeft = "3px";
        };

      }

      clearTimeout(this.timer);
      this.timer = null;

      this.anchor = args.domEvent.target;
      this.tooltip.open();

    },
    onEventHoverOut: (args: any, inst) => {
      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.tooltip.close();
        }, 200);
      }

      const el1: any = document.querySelectorAll(`.md-timeline-template-event`);
      for (let i = 0; i < el1.length; i++) {
        let row = el1[i]
        row.classList.add('opacity-100');
        row.style.borderLeft = "unset";
        row.style.fontWeight = "unset";
      };

    },
  }


  @Input() onSelectedDateChange(args) {
    this.start = moment(args.date).format('YYYY-MM-DD');
    this.dateChangeEmitter.emit(this.start)
  }

  onEventEventCreated(args) {
    this.clearEventOverlay()

    const mappedData = this.allEmployees.filter((row) => row.id === args.resource)

    let _data = {
      start: moment(args.date).format('YYYY-MM-DD'),
      end: moment(args.date).format('YYYY-MM-DD'),
      allDay: true,
      techRelated: true,
      title: [mappedData[0].name],
      resource_id: [mappedData[0].id]
    }
    let modalRef = this.eventModalCreateService.open(_data)
    modalRef.result.then((result: Comment) => {
      this.getData(args.inst._firstDay, args.inst._lastDay, false)
    }, () => { });
  }

  onEventCreate(args) {
    this.clearEventOverlay()
    let _data = {
      job: {
        request_date: moment(args.date).format('YYYY-MM-DD'),
        original_request_date: moment(args.date).format('YYYY-MM-DD'),
        created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
      },
      resource: args.resource
    }
    let modalRef = this.jobModalCreateService.open(_data)
    modalRef.result.then((result: any) => {
      this.getData(args.inst._firstDay, args.inst._lastDay, false);
    }, () => {
      this.myEvents = [...this.myEvents];
    });
  }

  async onEventUpdated(args) {
    this.clearEventOverlay()
    this.router.navigate([], {
      queryParamsHandling: 'merge',
      queryParams: {
        'event_id': args.event.id
      }
    })
    this.event_id = args.event.id;
    try {
      await this.calendarEventService.update(args.event.id, {
        event: {
          start_date: moment(args.event.start).format('YYYY-MM-DD HH:mm'),
          end_date: moment(args.event.end).format('YYYY-MM-DD HH:mm'),
          resource: args.event?.resource ? args.event?.resource.toString() : ""
        }
      });
      this.getData(args.inst._firstDay, args.inst._lastDay, false);
    } catch (err) {

      this.myEvents = [...this.myEvents]
    }
  }

  getAttribut() {

    if (this.previousId)
      setTimeout(() => {
        const el1: any = document.querySelectorAll(`[data-id="${this.previousId}"]`);

        if (el1) {
          for (let i = 0; i < el1.length; i++) {
            // let row = el1[i]
            // let el: any = row.querySelectorAll(`.mbsc-ios .mbsc-timeline-event-background`)[0]
            // el.style.borderLeft = "3px solid red";
            // el.style.opacity = "1";
            // row.style.fontWeight = "800";
            // row.scrollIntoViewIfNeeded(true);
          };

          if (el1[0]) {
            el1[0].style.fontWeight = "800";
            el1[0].scrollIntoViewIfNeeded(true);
          };
        }

      }, 0);
  }


  clearEventOverlay() {
    this.tooltip?.close();
    this.id = null;
    // this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
    //   queryParamsHandling: 'merge',
    //   queryParams: {
    //     id: null,
    //   }
    // })

    const love: any = document.querySelectorAll(`.md-timeline-template-event`);
    for (let i = 0; i < love.length; i++) {
      let row = love[i]
      row.classList.remove('opacity-75');
      row.classList.remove('opacity-100');
      row.style.borderLeft = "unset";
      row.style.fontWeight = "unset";
    };
  }

  setEventOverlay() {
    const love: any = document.querySelectorAll(`.md-timeline-template-event`);
    for (let i = 0; i < love.length; i++) {
      let row = love[i]
      //row.classList.add('opacity-75');
      row.classList.remove('opacity-100');
      row.style.borderLeft = "unset";
      row.style.fontWeight = "unset";
    };
  }
  setEventOverlay100() {
    const love: any = document.querySelectorAll(`.md-timeline-template-event`);
    for (let i = 0; i < love.length; i++) {
      let row = love[i]
      row.classList.add('opacity-100');
      row.style.borderLeft = "unset";
      row.style.fontWeight = "unset";
    };
  }

  showEventSelected(id = this.id, enableScroll = true) {
    const el1: any = document.querySelectorAll(`[id="${id}"]`);
    for (let i = 0; i < el1.length; i++) {
      let row = el1[i]

      row.style.borderLeft = "5px solid red";
      row.style.fontWeight = "400";
      row.style.paddingLeft = "3px";
      row.classList.add('calendar-active');
      row.classList.add('opacity-100');
    };

    if (enableScroll)
      el1[0].scrollIntoViewIfNeeded();

  }

  scrollTo() {

    if (this.id)
      setTimeout(() => {

        this.setEventOverlay()
        this.showEventSelected()

      }, 0);
  }

  viewRequest(id) {
    window.open("https://dashboard.eye-fi.com/dist/web/dashboard/field-service/request/edit?selectedViewType=Open&id=" + id, "_blank"); // Open new tab

  }

  previousId
  async onEventClick(args) {
    this.clearEventOverlay()
    if (args.event.type_of_event == 'EVENT') {
      this.onEventEventCreate(args)
      return
    } else if (args.event.type_of_event == 'JOB') {

      this.id = args.event.id

      this.previousId = args.event.id;

      // this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
      //   queryParamsHandling: 'merge',
      //   queryParams: {
      //     id: args.event.id,
      //     start: moment(args.date).format('YYYY-MM-DD'),
      //     previousId: args.event.id,
      //   }
      // });



      let modalRef = this.jobModalEditService.open(this.id)
      modalRef.result.then((result: any) => {
        this.getData(args.inst._firstDay, args.inst._lastDay, false)
      }, () => {
        this.myEvents = [...this.myEvents];
      });
    }
  }

  onEventEventCreate(data) {
    let modalRef = this.eventModalService.open(data.event.id)
    modalRef.result.then((result: Comment) => {
      this.getData(data.inst._firstDay, data.inst._lastDay, false)
    }, () => { });
  }

  ticketId = null;
  showTicket = (id) => {
    this.id = null;
    this.ticketId = id;
  }

  getStartDateFromPreviousId() {
    for (let i = 0; i < this.myEvents.length; i++) {
      if (this.myEvents[i].id == Number(this.previousId)) {
        return moment(this.myEvents[i].start).format('YYYY-MM-DD')
        break;
      }
    }
    return null
  }
  goBack = () => {
    this.id = null;
    this.ticketId = null;

    this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: null,
        ticketId: null,
        start: this.start,
      }
    }).then(() => {
      this.getAttribut();
    });

  }

  getOccuppancy(events: any) {
    let occuppancy: any = 0;
    if (events) {
      var resourceIds = [];
      var nr = 0;
      for (const event of events) {
        let e = isArray(event?.resource) ? event?.resource?.flat() : event?.resource
        if (resourceIds.indexOf(e) < 0) {
          nr++;
          resourceIds = [...resourceIds, e];
        }
      }
      occuppancy = (nr * 100 / this.allEmployees.length).toFixed(0);
      if (occuppancy > 100) occuppancy = 100
    }
    return occuppancy;
  }

  getEventOccurrence(args: any): any {
    let eventOccurrence = 'none';
    if (moment(args.date).format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
      eventOccurrence = 'today';
    } else {
      if (args.events) {
        var eventNr = args.events.length;
        if (eventNr >= this.allEmployees.length) {
          eventOccurrence = 'close';
        } else if (eventNr === 0) {
          eventOccurrence = 'none';
        } else if (eventNr === 1) {
          eventOccurrence = 'one';
        } else if (eventNr < 4) {
          eventOccurrence = 'few';
        } else {
          eventOccurrence = 'more';
        }
      }
    }
    return eventOccurrence;
  }
}
