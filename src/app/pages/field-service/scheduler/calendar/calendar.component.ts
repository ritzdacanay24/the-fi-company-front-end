import { JobService } from '@app/core/api/field-service/job.service';
import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';

import { CalendarOptions, EventClickArg, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import moment from 'moment';

const _moment = (date: moment.MomentInput, format = 'YYYY-MM-DD') => moment(date).format(format)


import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { ActivatedRoute, Router } from '@angular/router';
import tippy from 'tippy.js';
import { JobOverviewComponent } from '../../job/job-overview/job-overview.component';
import { TicketOverviewComponent } from '../../ticket/ticket-overview/ticket-overview.component';
import { EventModalService } from '../event/event-modal/event-modal.component';
import { NAVIGATION_ROUTE } from '../../job/job-constant';
import { JobModalService } from '../../job/job-modal/job-modal.service';
import { SharedModule } from '@app/shared/shared.module';
tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });


@Component({
  standalone: true,
  imports: [
    SharedModule,
    FullCalendarModule,
    TicketOverviewComponent,
    JobOverviewComponent
  ],
  selector: 'app-calendar',
  templateUrl: `./calendar.component.html`,
  styleUrls: [`./calendar.component.scss`]
})
export class CalendarComponent implements OnInit {

  @ViewChild('calendar') calendarComponent: FullCalendarComponent;
  @ViewChild('externalEvents', { static: true }) externalEvents: ElementRef;

  @Input() DefaultCalendarOptions: CalendarOptions;


  ngAfterContentChecked() {
  }

  createJob = () => {
    let modalRef = this.jobModalService.open(null)

    modalRef.result.then((result: Comment) => {
      this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)
    }, () => { });
  }

  createEvent() {
    let modalRef = this.eventModalService.open(null)

    modalRef.result.then((result: Comment) => {
      this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)
    }, () => { });
  }

  @Input() getData = async (start?, end?) => {
    this.calendarApi?.removeAllEvents();

    let data = await this.api.fsCalendar(moment(start).format('YYYY-MM-DD'), moment(end).format('YYYY-MM-DD'));
    this.myResources = data
    this.myEvents = data
    this.calendarOptions.events = data;


  };

  @Output() calendarElement: EventEmitter<any> = new EventEmitter()

  autoResize = () => window.dispatchEvent(new Event('resize'));

  instances: any;

  calendarOptions: CalendarOptions = {
    plugins: [
      dayGridPlugin,
      timeGridPlugin,
      listPlugin,
    ],
    headerToolbar: {
      right: 'dayGridMonth,dayGridWeek,dayGridDay,listWeek',
      center: 'title',
      left: 'prev,next today'
    },
    initialView: "dayGridMonth",
    themeSystem: "bootstrap",
    initialEvents: [],
    weekends: true,
    editable: true,
    selectable: true,
    selectMirror: true,

  };
  currentEvents: EventApi[] = [];
  myResources: Object;
  myEvents: any;
  previous_fsid: any;
  previous_start: any;

  get calendarApi() { return this.calendarComponent?.getApi(); }

  /**
   *
   * @param clickInfo
   * @param date
   */
  addEdit(clickInfo: EventClickArg, date) {
    let { event: { extendedProps: { type_of_event, fs_scheduler_id, ticket_id, publicId } } } = clickInfo

    if (fs_scheduler_id) {
      this.route.navigate([NAVIGATION_ROUTE.OVERVIEW], {
        queryParamsHandling: 'merge',
        queryParams: {
          id: fs_scheduler_id,
          previous_fsid: fs_scheduler_id,
          goBackUrl: location.pathname,
          previous_start: moment(clickInfo.event.start).format('YYYY-MM-DD'),
          instanceId: clickInfo.event._instance.instanceId,
        }
      });
    } else {
      let modalRef = this.eventModalService.open(clickInfo.event.id)
      modalRef.result.then(() => {


      this.route.navigate(['.'], {
        queryParamsHandling: 'merge',
        relativeTo: this.activatedRoute,
        queryParams: {
          previous_fsid: clickInfo.event.id,
        }
      });


        this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)
      }, () => { });
    }
  }

  /**
   *
   * @param date
   */
  createWorkOrderByDate = (date: any) => {

    //let modalRef = this.creatEventService.open({ start: _moment(date), end: _moment(date) })
  }

  /**
   *
   * @param clickInfo
   */
  createWorkOrder(clickInfo: any) { this.openWorkOrder(clickInfo) }

  openWorkOrder(date: any) {
  }


  /**
   *
   * @param clickInfo
   * @param result
   */
  updateEvent(clickInfo: EventClickArg, result: any) {

    let { event } = clickInfo
    let data = result

    this.setProps(event, 'setExtendedProp', {
      status: data.status,
      team: data.team,
      property: data.property,
      customer: data.customer,
    })

    this.setProps(event, 'setProp', {
      backgroundColor: data.backgroundColor,
      borderColor: data.borderColor,
      textColor: data.textColor,
      title: data.title || 'No Title',
    })

    event.setDates(data.start, data.start);

  }

  /**
     *
     * @param event
     * @param type
     * @param obj
     */
  setProps(event: any, type: any, obj: any) {
    for (const key in obj) {
      if (obj[key]) {
        event[type](key, obj[key]);
      }
    }
  }

  constructor(
    private api: SchedulerService,
    public route: Router,
    public activatedRoute: ActivatedRoute,
    private jobService: JobService,
    private cdref: ChangeDetectorRef,
    private eventModalService: EventModalService,
    private jobModalService: JobModalService
  ) { }


  ngAfterViewInit() {
    this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)

  }


  next() {
    this.calendarApi.next();
    this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)
  }

  previous() {
    this.calendarApi.prev();
    this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)
  }

  today() {
    this.calendarApi.today();
    this.getData(this.calendarApi.view.currentStart, this.calendarApi.view.currentEnd)
  }

  ngOnInit(): void {
    this.calendarOptions = {
      ...this.calendarOptions,
    }

  }

  getAttribut() {
    setTimeout(() => {
      const el1: any = document.querySelector(`[data-custom-id="${this.previous_fsid}"]`);
      if (el1) {
        el1.style.borderStyle = "dashed solid";
        el1.style.borderWidth = "2px";
        el1.style.borderColor = "red";
        //el1.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el1.scrollIntoView({ block: 'center' });
      }
    }, 0);

  }

  scheduleLaterJobs = []
  async getScheduleLaterJobs() {
    this.scheduleLaterJobs = await this.jobService.find({ schedule_later: 1, active: 1 })
  }



  id = null

}
