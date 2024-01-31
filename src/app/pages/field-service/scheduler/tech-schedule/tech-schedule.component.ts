import { CalendarEventService } from '@app/core/api/field-service/calendar-event.service';
import { ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MbscEventcalendarView, MbscCalendarEvent, MbscModule, MbscEventcalendarOptions, MbscEventcalendar, MbscPopup, formatDate, MbscPopupOptions, MbscSelectOptions } from '@mobiscroll/angular';
import moment from 'moment';
import tippy from 'tippy.js';
import { ActivatedRoute, Router } from '@angular/router';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { TicketOverviewComponent } from '../../ticket/ticket-overview/ticket-overview.component';
import { JobOverviewComponent } from '../../job/job-overview/job-overview.component';
import { NAVIGATION_ROUTE } from '../../job/job-constant';
import { NAVIGATION_ROUTE_TICKET } from '../../ticket/ticket-constant';
import { JobModalService } from '../../job/job-modal/job-modal.service';
import { SharedModule } from '@app/shared/shared.module';
tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });


const today = new Date();

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule,
    NgSelectModule,
    TicketOverviewComponent,
    JobOverviewComponent
  ],
  selector: 'app-resource-by-tech',
  templateUrl: `./tech-scheduler.component.html`,
  styleUrls: [`./tech-scheduler.component.scss`]
})
export class TechScheduleComponent implements OnInit {
  @ViewChild('calendar') calendarInstance: MbscEventcalendar;
  @Input() public pageView: "hour-by-hour" | "by-day" = "by-day";
  @Input() public view: string | any;
  previous_fsid: any = -1;
  instancess: any;

  createGroup() {

  }

  onSubmitForm = () => {

  }

  @ViewChild('popup', { static: false })
  tooltip!: MbscPopup;
  groups: any;
  currentView: any;
  textColor: any;
  default: MbscPopupOptions;
  previousArg: string | any;
  selectValue: string;

  constructor(
    private api: SchedulerService,
    private cdref: ChangeDetectorRef,
    private router: Router,
    public activatedRoute: ActivatedRoute,
    private fieldServiceMobileService: FieldServiceMobileService,
    private calendarEventService: CalendarEventService,
    private jobModalService: JobModalService
  ) { }

  connectingJobs: any = []

  createEventForTech = ({ event }) => {
    // this.tooltip?.close()
    // let modalRef = this.creatEventService.open({ id: event?.id, start: event.start, end: event.end, techName: event.resource, resource_contractor: event.resoruce_title == 'Vendor' ? 1 : 0 })

    // modalRef.result.then((result: Comment) => {
    //   this.getData(false);
    // }, () => {
    //   this.myEvents = [...this.myEvents]
    // });
  }

  getOccuppancy(events: any) {
    let occuppancy: any = 0;
    if (events) {
      var resourceIds = [];
      var nr = 0;
      for (const event of events) {
        if (resourceIds.indexOf(event.resource) < 0) {
          nr++;
          resourceIds = [...resourceIds, event.resource];
        }
      }
      occuppancy = (nr * 100 / this.myResources.length).toFixed(0);
    }
    return occuppancy;
  }

  conatainsTravel(data) {
    if (data.original?.title?.toLowerCase().includes('drive') || data.original?.title?.toLowerCase().includes('driving')) return 'car';
    if (data.original?.title?.toLowerCase().includes('fly')) return 'airplane';
    return ''
  }

  displayTime(data) {
    if (data.original.totalJobs > 1) {
      return `${data.original.totalJobs} jobs ${moment(data.original.start).format('M/D')} to ${moment(data.original.end).format('M/D')}`
    } else {
      return data.original.allDay ? 'All Day' : data.start
    }
  }
  displayTime1(data) {
    if (data.totalJobs > 1) {
      return `${data.totalJobs} jobs ${moment(data.start).format('M/D')} to ${moment(data.end).format('M/D')}`
    } else {
      return data.allDay ? 'All Day' : data.start
    }
  }

  isLoading = false;
  ngAfterContentChecked() {
    this.cdref?.detectChanges();
  }

  myEvents: MbscCalendarEvent[] = [];
  myResources: any = [];

  calView: MbscEventcalendarView | any = {
    timeline: {
      currentTimeIndicator: true,
    },
    eventList: {
      type: 'month',
      scrollable: true
    }
  };

  isStartFound: any;
  initalLoad = false;

  isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  event_id
  _start
  _end

  active = 1
  ngOnInit(): void {
    //this.calView = this.isJsonString(this.routeService.queryParam('calendarView')) || this.calView;

    //this.view = this.routeService.queryParam('typeOfView') || this.view;

    this.calView.timeline.eventList = this.pageView == 'by-day' ? true : false;

    this.activatedRoute.queryParams.subscribe((params: any) => {
      this.previous_fsid = params.previous_fsid || -1
      this.event_id = params.event_id || -1
      this._start = params.start
      this._end = params.end
      this.workOrderId = params.workOrderId
      this.id = params.id
      this.active = Number(params['active']) || this.active;
      this.viewing = params.viewing || ''
      this.calView = JSON.parse(params.calView)
      this.view = params.viewing || ''


      // if (this.view == 'month' && params.view == 1)
      //   this.view = 'week';
    });



  }


  createJob(event) {
    console.log(event)
    let modalRef = this.jobModalService.open(null, moment(event.start).format('YYYY-MM-DD'), event.end, event.resource)

    modalRef.result.then((result: Comment) => {
      this.getData()
    }, () => { });
  }

  ngAfterViewInit() {

  }

  isObjEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  start: moment.MomentInput;
  end: moment.MomentInput;

  eventInstance
  onPageLoading = async (event: any) => {


    this.eventInstance = event
    //this.isStartFound = this.routeService.allQueryParams;


    console.log(this._start, 'ffff')


    let start = event.firstDay;
    let end = event.lastDay;

    if (!this.initalLoad && (this._start && this._end)) {
      start = this._start
      end = this._end
    }


    this.start = start;
    this.end = end;


    event.inst.navigate(start);

    await this.getData()
    this.initalLoad = true;

  }

  myConnections = []
  async getData(refresh = true) {

    this.tooltip?.close();

    //this.myEvents = [];
    try {
      this.isLoading = true;
      const start = moment(this.start).format('YYYY-MM-DD');
      const end = moment(this.end).format('YYYY-MM-DD');


      this.router.navigate([], {
        queryParams: {
          start: start,
          end: end
        },
        queryParamsHandling: 'merge'
      });


      //this.routeService.setParams({ start, end });

      let data: any = await this.api.fsTechCalendar(start, end);



      for (const event of data.info) {

        // event.group_id = event?.group_id?.split(",");
        // convert dates to date objects
        event.start = event.start ? new Date(event.start) : event.start;
        event.end = event.end ? new Date(event.end) : event.end;
        event.id = event.resource_id

        console.log(event)
        // mark past events as fixed by setting the event.editable property to false
        //event.editable = event.start && today < event.start;
        if (this.previous_fsid == event.fs_scheduler_id) {


          // let s = {
          //   date:event.start,
          //   background: 'orange'
          // }

          // this.calendarOptions.colors.push(s)
        }

        event.tooltip = `${event.title} \n${event.property || ''} \n${moment(event.start).format('HH:mm')} to ${moment(event.end).format('HH:mm')}`
      }

      this.myEvents = data.info;
      this.myResources = data.info1;
      this.myConnections = data.myConnections



      if (refresh)
        setTimeout(() => {
          var plant = document.getElementById(`test_${this.event_id}`);

          if (plant)
            plant.scrollIntoView({ block: 'center', behavior: 'smooth' });

        }, 500);

      this.isLoading = false;
    } catch (er) {
      this.isLoading = false;

    }
  }

  instances: any;

  calendarOptions: MbscEventcalendarOptions = {
    theme: 'ios',
    themeVariant: 'light',
    clickToCreate: true,
    dragToCreate: false,
    dragToMove: true,
    dragToResize: false,
    eventDelete: true,
    showEventTooltip: true,
    colors: [{
      start: '00:00',
      end: '24:00',
      recurring: {
        repeat: 'weekly',
        weekDays: 'SU, SA'
      },
      cssClass: 'bg-light-gray'
    }],
    // invalid: [{
    //   recurring: {
    //     repeat: 'daily',
    //     until: today,
    //   },
    //   cssClass: 'bg-dark-gray'
    // }],
    onEventCreateFailed: (event) => {
      if (!event.originEvent) {
        //this.toasterService.showError('Can\'t create event in the past');
      }
    },

    onEventUpdated: async (event, inst) => {



      this.router.navigate([], {
        queryParamsHandling: 'merge',
        queryParams: {
          'event_id': event.event.id
        }
      })

      this.event_id = event.event.id

      try {
        await this.calendarEventService.update(event.event.id, {
          event: {
            start_date: moment(event.event.start).format('YYYY-MM-DD HH:mm'),
            end_date: moment(event.event.end).format('YYYY-MM-DD HH:mm'),
            resource: event.event?.resource ? event.event?.resource.toString() : ""
          }
        });
        this.getData(false);
      } catch (err) {

        this.myEvents = [...this.myEvents]
      }
    },

    onEventCreate: (args) => {


      const oldEvent = args.originEvent;
      const start = oldEvent && oldEvent.start ? oldEvent.start : null;

      // handle recurring events
      if (start && start < today) {
        //this.toasterService.showError('Can\'t create event in the past');

        return false;
      } else {
        return true;
      }
    },


    onCellClick: (args, inst) => {

      this.router.navigate([], {
        queryParamsHandling: 'merge',
        queryParams: {
          'event_id': null
        }
      })

      this.event_id = null

      document.querySelectorAll('.selected-event.light-blue').forEach(e => e.classList.remove("light-blue"));

      args.target.className += " selected-event light-blue"

      this.tooltip.close();
    },
    onCellHoverOut(args, inst) {
      args.target.className += " "

    },
    onEventCreated: async (args: any, inst) => {

      this.default = this.popupOptions1
      const event: any = args.event;
      event.id = null;

      this.currentView = {
        type_of_event: 'CREATE_NEW'
      };

      // clearTimeout(this.timer);
      // this.timer = null;

      // this.anchor = args.target;
      // this.tooltip.open();

      const resource: any = this.myResources.find(dr => dr.id === event.resource);

      args.event.resoruce_title = resource.title

      console.log(event)

      //this.createEventForTech(args)

      this.createJob(event)
    },
    onEventDoubleClick: (event, inst) => {
      if (event.event['fs_scheduler_id']) {
        //this.createEventModalService.open(event.event.fs_scheduler_id, 'Job')
        this.viewJob(event.event['fs_scheduler_id'])
      } else if (event.event.id) {
        //this.createTechEventModalService.open(event.event.id)
        this.createEventForTech(event)
        return;
      }
    },
    onEventClick: async (args: any, inst) => {
      this.default = this.popupOptions
      const event: any = args.event;
      const resource: any = this.myEvents.find(dr => dr.id === event.id);


      this.groups = resource?.group_id;
      const time = formatDate('hh:mm A', new Date(event.start)) + ' - ' + formatDate('hh:mm A', new Date(event.end));


      this.currentEvent = event;

      this.status = resource.status;


      event.group_ids = (typeof event.group_ids == "string") ? event?.group_ids?.split() : event?.group_ids;


      this.bgColor = resource?.color;
      this.textColor = resource?.textColor;
      this.info = event.title
      this.time = time;
      this.reason = event.reason;
      this.location = event.location;
      this.currentView = event;


      //this.currentView.group_ids = event?.group_ids ? event?.group_ids?.split() : [];


      // clearTimeout(this.timer);
      // this.timer = null;

      let e = args.domEvent.target

      this.anchor = args.domEvent.target;

      //getusers
      let ee: any = this.myEvents
      this.connectingJobs = await this.api.getConnectingJobsByTech(args.resource, moment(args.date).subtract(1, 'w').format(), moment(args.date).add(1, 'w').format())

      this.router.navigate([], {
        queryParamsHandling: 'merge',
        queryParams: {
          'event_id': event.id
        }
      })

      this.event_id = event.id

      this.tooltip.open();

      // if (event.event.fs_scheduler_id) {
      //   //this.createEventModalService.open(event.event.fs_scheduler_id, 'Job')
      //   this.viewJob(event.event.fs_scheduler_id)
      // } else if (event.event.id) {
      //   //this.createTechEventModalService.open(event.event.id)
      //   this.createEventForTech(event)
      //   return;
      // }


    },

    // onEventHoverIn: (args, inst) => {
    //   this.default = this.popupOptions
    //   const event: any = args.event;
    //   const resource: any = this.myEvents.find(dr => dr.id === event.id);

    //   this.groups = resource?.group_id;
    //   const time = formatDate('hh:mm A', new Date(event.start)) + ' - ' + formatDate('hh:mm A', new Date(event.end));

    //   this.currentEvent = event;

    //   this.status = resource.status;

    //   this.bgColor = resource?.color;
    //   this.textColor = resource?.textColor;
    //   this.info = event.title
    //   this.time = time;
    //   this.reason = event.reason;
    //   this.location = event.location;
    //   this.currentView = event;

    //   clearTimeout(this.timer);
    //   this.timer = null;

    //   this.anchor = args.domEvent.target;
    //   this.tooltip.open();
    // },
    // onEventHoverOut: (r) => {
    //   if (!this.timer) {
    //     this.timer = setTimeout(() => {
    //       this.tooltip.close();
    //     }, 200);
    //   }
    // },

    onEventRightClick: (args) => {
      // args.domEvent.preventDefault();
      // this.menuAnchor = args.domEvent.target;
      // setTimeout(() => {
      //   this.menu.open();
      // });
    },
  }


  @ViewChild('menu', { static: false })
  menu!: any;

  testBtn = () => {
    alert('sdfasdf')
  }

  async deleteById(event) {

    try {
      await this.calendarEventService.delete(event.id);
      this.getData(false);
    } catch (err) {

      this.myEvents = [...this.myEvents]
    }

  }

  async duplicate() {

    // try {
    //   await this.calendarEventService.create(event.id);
    //   this.getData();
    // } catch (err) {

    //   this.myEvents = [...this.myEvents]
    // }

  }

  menuAnchor
  menuSettings: MbscSelectOptions = {
    touchUi: false,
    display: 'anchored',
    buttons: [],
    onChange: (args) => {
      if (args.value === 'update') {
        //this.updateSelectedEvents();
      } else if (args.value === 'delete') {
        //this.deleteSelectedEvents(this.mySelectedEvents);
      } else if (args.value === 'duplicate') {
        //this.deleteSelectedEvents(this.mySelectedEvents);
      }
    },
    onClose: () => {
      // clear selection
      this.selectValue = '';
    }
  };

  currentEvent: any;
  status = '';
  buttonText = '';
  buttonType = '';
  bgColor = '';
  info = '';
  time = '';
  reason = '';
  location = '';
  anchor: HTMLElement | undefined;
  timer: any;



  showJob = ($event) => {

    this.viewing = 'Job'

    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { viewing: this.viewing } });


  }

  showTicket = ($event) => {

    this.viewing = 'Ticket'

    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { viewing: this.viewing } });


  }

  id = null
  data
  viewing = ''
  viewJob = (fsid) => {
    this.tooltip.close();

    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: this.currentView.fs_scheduler_id,
        goBackUrl: location.pathname,
      }
    });

  }

  workOrderId = null
  viewTicket = (ticket_id) => {

    this.tooltip.close();
    this.router.navigate([NAVIGATION_ROUTE_TICKET.OVERVIEW], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: this.currentView.ticket_id,
        goBackUrl: location.pathname,
      }
    });

  }

  goBackCalendar = () => {
    this.id = null
    this.active = null
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: this.id, active: null } });
  }


  @Input() goBackToJob: Function = () => {
    this.viewing = null
    this.workOrderId = null
    this.active = null
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { workOrderId: this.workOrderId, active: null, viewing: null, id: null } });
  }


  onSelect($event) {
    this.router.navigate(['.'], {
      queryParams: {
        active: $event
      },
      relativeTo: this.activatedRoute
      , queryParamsHandling: 'merge'
    });
  }

  get eventList() {
    return this.pageView == 'by-day' ? true : false
  }


  changeView(view): void {
    this.view = view;
    switch (this.view) {
      case 'hour':
        this.calView = {
          timeline: {
            type: 'month',
            size: 1,
            resolutionHorizontal: 'hour',
          }
        };

        break;
      case 'day':
        this.calView = {
          timeline: { eventList: this.eventList, type: 'day' }
        };

        break;
      case 'workweek':
        this.calView = {
          timeline: {
            eventList: this.eventList,
            type: 'week',
            startDay: 1,
            endDay: 5
          }
        };

        break;
      case 'week':
        this.calView = {
          timeline: {
            eventList: this.eventList,
            type: 'week',
            rowHeight: 'variable'
          }
        };

        break;
      case 'month':
        this.calView = {
          timeline: {
            eventList: this.eventList,
            type: 'month'
          }
        };
        break;
    }

    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { view: this.view, calView: JSON.stringify(this.calView) } });

    //this.routeService.setParams({ typeOfView: this.view, calendarView: JSON.stringify(this.calView) });
  }


  mouseEnter(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  mouseLeave(): void {
    if (this.currentView.type_of_event == "CREATE_NEW") return;
    this.timer = setTimeout(() => {
      this.tooltip.close();
    }, 200);
  }

  setStatus(): void {
    // const index = this.appointments.findIndex((item: any) => item.id === this.currentEvent.id);
    // this.appointments[index].confirmed = !this.appointments[index].confirmed;
    // this.tooltip.close();
    // this.notify.toast({
    //   message: 'Appointment ' + (this.currentEvent.confirmed ? 'confirmed' : 'canceled')
    // });
  }

  viewFile(): void {
    // this.tooltip.close();
    // this.notify.toast({
    //   message: 'View file'
    // });
  }

  deleteApp(): void {
    // this.appointments = this.appointments.filter((item: any) => item.id !== this.currentEvent.id);
    // this.tooltip.close();
    // this.notify.toast({
    //   message: 'Appointment deleted'
    // });
  }

  popupOptions: MbscPopupOptions = {
    display: 'anchored',
    touchUi: false,
    anchorAlign: 'center',
    showOverlay: false,
    contentPadding: false,
    closeOnOverlayClick: false,
    width: 350,
    showArrow: true,
    closeOnScroll: true,
    scrollLock: true,

  };
  popupOptions1: MbscPopupOptions = {
    display: 'anchored',
    touchUi: false,
    showOverlay: false,
    anchorAlign: 'center',
    contentPadding: false,
    closeOnOverlayClick: false,
    width: 350,
    showArrow: false,
    closeOnScroll: true,
    scrollLock: true,
    onClose: (args) => {
      if (args.type == 'onClose') {

        this.myEvents = [...this.myEvents]
      }
    }

  };

  closeCreate() {

    this.myEvents = [...this.myEvents]
    this.tooltip.close()
  }

}
