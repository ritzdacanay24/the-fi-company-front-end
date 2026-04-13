import { Component, Input, OnInit, SimpleChanges } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgbDropdownModule, NgbNavModule, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { AgGridModule } from 'ag-grid-angular'
import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service'
import moment from 'moment';
import _ from 'lodash';
import { WorkInfoService } from '../work-info/work-info.service'
import { setOptions, MbscEventcalendarView, MbscModule, MbscEventcalendarOptions } from '@mobiscroll/angular';
import { PrintTicketModule } from '../print-ticket/print-ticket.module'
import { PrintTicketService } from '../print-ticket/print-ticket.service'
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service'
import { SharedModule } from '@app/shared/shared.module'
import { calculateSummaryLabor, sumLaborAndBreakTimes, sumLaborAndBreakTimesAndConvert, sumLaborAndBreakTimesAndConvertToQrtHrs, timeConvert, zoneAbbr } from '@app/pages/field-service/shared/field-service-helpers.service'
import { EventService } from '@app/core/services/event.service'
import { RootReducerState } from '@app/store'
import { getLayoutMode } from '@app/store/layouts/layout-selector'
import { Store } from '@ngrx/store'

let sameElse = 'dddd, MMM DD, YYYY';

setOptions({
  theme: 'ios',
  themeVariant: 'light'
});

import { ViewChild, TemplateRef } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select'
import { SchedulerService } from '@app/core/api/field-service/scheduler.service'
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component'
import { AuthenticationService } from '@app/core/services/auth.service'
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    AgGridModule,
    NgbNavModule,
    PrintTicketModule,
    MbscModule,
    NgSelectModule,
    JobSearchComponent
  ],
  selector: 'app-event',
  templateUrl: `./event.component.html`,
  styles: [``],
})
export class EventComponent implements OnInit {
  @Input() public workOrderId: string;
  @Input() public disabled: boolean = true;
  myEvents: any[]
  refDate: string

  @ViewChild('copyFromTicketModal', { static: false }) copyFromTicketModal: TemplateRef<any>;


  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData(true, false, true);
    }
  }

  fullscreen = false;
  firstDay: any;
  lastDay: any;
  onClickFullscreen() {
    //TODO: set params in url to save fullscreen state on refresh

    this.fullscreen = !this.fullscreen;
  }

  print(printDetails?) {
    this.printTicketService.open(this.workOrderId, printDetails)
  }

  view: MbscEventcalendarView = {
    timeline: {
      type: 'day',
      timeCellStep: 15,
      timeLabelStep: 30,
      size: 2

    }
  };

  viewReceipt(row) {
    window.open(row.link, 'Image', 'width=largeImage.stylewidth,height=largeImage.style.height,resizable=1');

  }

  settings: MbscEventcalendarOptions = {
    onEventDoubleClick: (args:any, inst) => {
      // Handle different event types
      // if (args.event.eventType === 'receipt') {
      //   this.viewReceiptDetails(args.event.receiptData);
      // } else {
      //   this.openWorkInfo(args.event.id);
      // }
    },

    onEventCreated: async (event:any, inst) => {
      // Only allow creating work events, not receipts
      if (event.event.eventType === 'receipt') {
        this.myEvents = [...this.myEvents]; // Revert
        return;
      }

      try {
        await this.fieldServiceMobileService.createEvent({
          projectStart: moment(event.event.start).format('YYYY-MM-DD HH:mm'),
          projectFinish: moment(event.event.end).format('YYYY-MM-DD HH:mm'),
          proj_type: event.event.title,
          workOrderId: this.workOrderId
        })

        this.getData(false, false);
      } catch (err) {
        this.myEvents = [...this.myEvents]
      }
    },
    onEventDragEnd: async (event:any, inst) => {
      // Prevent dragging receipt events
      if (event.event.eventType === 'receipt') {
        this.myEvents = [...this.myEvents]; // Revert
        return;
      }
    },
    onEventUpdated: async (event:any, inst) => {
      // Only allow updating work events, not receipts
      if (event.event.eventType === 'receipt') {
        this.myEvents = [...this.myEvents]; // Revert
        return;
      }

      try {
        await this.fieldServiceMobileService.updateEventById(event.event.id, {
          projectStart: moment(event.event.start).format('YYYY-MM-DD HH:mm'),
          projectFinish: moment(event.event.end).format('YYYY-MM-DD HH:mm')
        })
        this.getData(false, false);
      } catch (err) {
        this.myEvents = [...this.myEvents]
      }
    },
    // Enhanced event rendering for receipts
    renderEvent: (event:any) => {
      if (event.eventType === 'receipt') {
        return `
          <div class="receipt-event">
            <i class="ri-receipt-line"></i>
            <span class="receipt-vendor">${event.receiptData?.vendor_name || 'Receipt'}</span>
            <span class="receipt-amount">$${event.receiptData?.cost || '0'}</span>
          </div>
        `;
      }
      return null; // Use default rendering for work events
    }
  }

  calculateTotal(row) {

    let totalTime = 0;
    let breaktotalTime = 0;

    if (row.projectStart && row.projectFinish) {
      totalTime = sumLaborAndBreakTimes({
        start: row.projectStart,
        finish: row.projectFinish,
        start_tz: row.projectStartTz,
        finish_tz: row.projectFinishTz,
        brStart: row.brStart,
        brEnd: row.brEnd,
      });
    }

    return totalTime
  }


  printEventsOnly() {
    setTimeout(() => {
      var printContents = document.getElementById('printDiv').innerHTML;
      var popupWin = window.open('', '_blank', 'width=1000,height=600');
      popupWin.document.open();

      popupWin.document.write(`
        <html>
          <head>
            <title>Event timeline</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css">
            <style>
            @page {
              size: portrait;
            }
            </style>
          </head>
          <body onload="window.print();window.close()">${printContents}</body>
        </html>
      `
      );

      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);

  }

  isDateNull(date, format) {
    return date ? moment(date).format(format) : "";
  }

  openEvent(e) {
  }

  compare(start, finish) {

    if (!start && !finish) {
      return {
        start: '',
        finish: ''
      }
    }

    let dateStart = moment(start);
    let dateFinish = moment(finish);
    let days = dateStart.diff(dateFinish, "days");

    if (!moment(start).isSame(finish, 'day')) {
      return {
        start: this.isDateNull(start, "l LT"),
        finish: this.isDateNull(finish, "l LT")
      }

    } else if (days == 0) {
      return {
        start: moment(start).format('LT') || '',
        finish: moment(finish).format('LT') || ''
      }
    } else {
      return {
        start: this.isDateNull(start, "l LT"),
        finish: this.isDateNull(finish, "l LT")
      }
    }
  }


  themeVariant: any = 'light';

  constructor(
    private fieldServiceMobileService: FieldServiceMobileService,
    private workInfoService: WorkInfoService,
    private printTicketService: PrintTicketService,
    public tripExpenseService: TripExpenseService,
    public eventService: EventService,
    private store: Store<RootReducerState>,
    private modalService: NgbModal,
    private schedulerService: SchedulerService,
    private authenticationService: AuthenticationService
    // private ticketService: TicketService, // <-- your service for fetching tickets/records
  ) {

    this.eventService.subscribe('changeMode', (mode: any) => {
      this.themeVariant = mode;
    })
    this.store.select(getLayoutMode).subscribe((mode) => {
      this.themeVariant = mode;
    })

  }

  eventInstance
  onPageLoading = async (event: any) => {

    this.eventInstance = event
    let start = event.firstDay;
  }

  sumLaborAndBreakTimesAndConvert = sumLaborAndBreakTimesAndConvert;
  sumLaborAndBreakTimesAndConvertToQrtHrs = sumLaborAndBreakTimesAndConvertToQrtHrs;
  zoneAbbr = zoneAbbr;
  timeConvert = timeConvert;
  _travelAndWorkTotalHrs = 0;

  getGapsFromRangesArray(from, until, ranges) {
    let chunks = [],
      i = 0, len = ranges.length, range;

    let _from = from;

    // If there are no ranges cached, create one big chunk for entire range.
    if (!len) {
      chunks.push({ from: from, until: until });
    } else {

      for (; i < len; i++) {
        range = ranges[i];

        // Cache is complete or from is higher then until, we can stop looping
        if (range.from >= until || (range.from <= from && range.until >= until)) {
          _from = until;
          break;
        }

        // Range hasn't gotten to from date yet, so continue
        if (range.until < from)
          continue;

        // This range is lower then the current _from time, so we can go ahead to its until time
        if (range.from <= _from) {
          _from = range.until;
        }
        // This range is higher then the current _from time, so we are missing a piece
        else {
          chunks.push({
            from: _from,
            missing: 'missing: ' + moment(_from).format('llll') + ' to ' + moment(range.from).format('llll'),
            until: range.from
          });
          _from = range.until;
        }
      }

      // Final piece (if required)
      // if (_from < until) {
      //   chunks.push({
      //     from: _from,
      //     until: until
      //   });
      // }
    }

    return chunks
  }

  checkDateTimeOverlap = (dateTimes: any) => {
    let isOverlap = false;
    let dates = [];

    if (!dateTimes || dateTimes.length < 2) {
      return { isOverlap: false, dates: [] };
    }

    // Step 1: Convert to Date objects and validate
    const dt_list = dateTimes.map((a) => {
      if (!a || a.length < 2) return null;
      return [new Date(a[0]), new Date(a[1])];
    }).filter(item => item !== null && !isNaN(item[0].getTime()) && !isNaN(item[1].getTime()));

    if (dt_list.length < 2) {
      return { isOverlap: false, dates: [] };
    }

    // Step 2: Check for overlaps between all pairs
    for (let i = 0; i < dt_list.length; i++) {
      for (let j = i + 1; j < dt_list.length; j++) {
        const event1 = dt_list[i];
        const event2 = dt_list[j];
        
        // Check if events overlap: start1 < end2 && start2 < end1
        const overlap = event1[0] < event2[1] && event2[0] < event1[1];
        
        if (overlap) {
          isOverlap = true;
          
          // Calculate the actual overlap period
          const overlapStart = new Date(Math.max(event1[0].getTime(), event2[0].getTime()));
          const overlapEnd = new Date(Math.min(event1[1].getTime(), event2[1].getTime()));
          
          // Only add if it's a meaningful overlap (more than 1 minute)
          if (overlapEnd.getTime() - overlapStart.getTime() > 60000) {
            dates.push({ 
              from: overlapStart, 
              to: overlapEnd,
              event1Start: event1[0],
              event1End: event1[1],
              event2Start: event2[0],
              event2End: event2[1]
            });
          }
        }
      }
    }

    return { isOverlap, dates };
  }

  minsMissing = [];
  _groupMyData(data) {
    this.minsMissing = [];
    const groups = data.reduce((groups, game) => {
      const date = moment(game.projectStart).calendar({
        sameDay: '[Today] • ddd, MMM DD, YYYY',
        nextDay: '[Tomorrow] • ddd, MMM DD, YYYY',
        nextWeek: 'dddd, MMM DD, YYYY',
        lastDay: '[Yesterday] • ddd, MMM DD, YYYY',
        lastWeek: 'ddd, MMM DD, YYYY',
        sameElse: sameElse,
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(game);
      return groups;
    }, {});

    var testData = []
    var testData1 = []
    let colors = []
    // Edit: to add it in the array format instead
    let groupArrays = Object.keys(groups).map((date) => {
      let groupTotal = 0;
      testData = []
      let dates: any = [];
      for (let i = 0; i < groups[date].length; i++) {

        if (groups[date][i].event_name == 'Clock-In') {
          groups[date][i].projectFinish = groups[date][i].projectStart
        }

        if (groups[date][i].event_name == 'Clock-Out') {
          groups[date][i].projectFinish = groups[date][i].projectStart
        }

        if (groups[date][i].include_calculation == 1) {
          if (groups[date][i].event_name == 'Break') {
            groups[date][i].mins = Math.abs(groups[date][i].mins);
          }


          groupTotal += groups[date][i].mins;
        }


        if (groups[date][i].projectStartTz) {
          dates.push((moment(groups[date][i].projectStart)))
        } else {
          dates.push((moment(groups[date][i].projectStart)))
        }

        if (groups[date][i].projectFinishTz) {
          dates.push((moment(groups[date][i].projectFinish)))
        } else {
          dates.push((moment(groups[date][i].projectFinish)))
        }

        testData.push(
          {
            "from": moment(groups[date][i].projectStart),
            "until": moment(groups[date][i].projectFinish)
          })

        testData1.push([
          moment(groups[date][i].projectStart).format('YYYY-MM-DD HH:mm'), moment(groups[date][i].projectFinish).format('YYYY-MM-DD HH:mm')
        ])
      }

      dates.sort((a, b) => Date.parse(a) - Date.parse(b))

      let minDate = moment((Math.min.apply(null, dates)));
      let maxDate = moment((Math.max.apply(null, dates)));

      let mi = this.getGapsFromRangesArray(minDate, maxDate, testData)
      this.minsMissing.push(mi);


      let totalMissingMinutes = 0;

      this.minsMissing = this.minsMissing.flat();


      for (let i = 0; i < mi.length; i++) {
        groups[date].push({
          projectStart: moment(mi[i].from).format('YYYY-MM-DD HH:mm'),
          projectFinish: moment(mi[i].until).format('YYYY-MM-DD HH:mm'),
          projectStartTz: 'America/Los_Angeles',
          projectFinishTz: 'America/Los_Angeles',
          event_name: "Missing times",
          cssClass: "table-danger",
          include_calculation: 0,
          hasError: true,
        })

        var duration: any = moment.duration(mi[i].until.diff(mi[i].from));
        totalMissingMinutes += duration.asMinutes();

        colors.push({
          start: mi[i].from,
          end: mi[i].until,
          title: "No times found",
          cssClass: 'text-center md-rect-bg',
          hasWarning: true
        })

      }

      //overlap
      let e: any = this.checkDateTimeOverlap(testData1);


      for (let i = 0; i < e.dates.length; i++) {

        let s = groups[date].filter((num) => moment(e.dates[i].from).format('YYYY-MM-DD HH:mm') == moment(num.projectStart).format('YYYY-MM-DD HH:mm'))

        if (s.length)
          s[0].cssClass = "table-warning";
        colors.push({
          start: e.dates[i].from,
          end: e.dates[i].to,
          title: "overlap",
          cssClass: 'md-stripes-bg'
        })
      }





      groups[date].sort((a, b) => Date.parse(a.projectStart) - Date.parse(b.projectStart))

      this.settings = {
        // invalid: colors,
        colors: colors
      };

      return {
        groupTotal: groupTotal,
        minDate: minDate,
        maxDate: maxDate,
        minutes: totalMissingMinutes,
        dates: dates,
        minMissing: mi,
        dateRaw: moment(new Date(date)).format('YYYY-MM-DD'),
        date,
        testData,
        games: groups[date]
      };

    });


    return { groups, groupArrays }
  }


  ngOnInit(): void {
  }

  data: any = [];

  getNestedChildren(arr, parent?) {
    var out = []
    for (var i in arr) {
      if (arr[i].parent_id == parent) {
        var childs = this.getNestedChildren(arr, arr[i].id)

        if (childs.length) {
          arr[i].childs = childs
        }
        out.push(arr[i])
      }
    }
    return out

  }

  loading = false;

  groupArrays = [];


  myResources = [{
    id: 1,
    name: '',
    color: '#239a21'
  }];

  getFirstDayOfEvents(data) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].projectStart) {
        return data[i].projectStart
        break
      }
    }
    return
  }

  getLastDayOfEvents(data) {
    let allDays = []
    for (let i = 0; i < data.length; i++) {
      if (data[i].projectFinish) {
        allDays.push(data[i].projectFinish)
      }
    }
    return allDays[allDays.length - 1]
  }

  getTotalDays(start, end) {
    var a = moment(start).startOf('day');
    var b = moment(end).endOf('day');
    return b.diff(a, 'days') + 1
  }

  _navigate(d) {
    this.eventInstance.inst.navigate(d);
  }

  isExpanded = false;
  expandTimeLine() {


    if (this.isExpanded) {
      this.view = {
        timeline: {
          timeCellStep: 15,
          timeLabelStep: 30,
          size: this.totalDays,
          type: 'day',
          startDay: moment(this.firstDay).day(),
          // endDay: moment(lastDay).day(),
          resolutionHorizontal: 'hour',
          resolutionVertical: 'day'
        }
      };
    } else {
      this.view = {
        timeline: {
          timeCellStep: 15,
          timeLabelStep: 30,
          size: this.totalDays,
          type: 'day',
          startDay: moment(this.firstDay).day(),
          // endDay: moment(lastDay).day(),
          resolutionHorizontal: 'hour'
        }
      };
    }

  }
  totalDays = 0;
  originalData
  async getData(showLoading?, letNavigate = true, refresh = false) {
    try {
      this.loading = showLoading ? true : false;
      let data: any = this.originalData = await this.fieldServiceMobileService.getEventViewByWorkOrderId(this.workOrderId);

      // Get receipts data for timeline
      let receipts: any = [];
      if (this.isShowingReceipts) {
        receipts = await this.tripExpenseService.getByWorkOrderId(this.workOrderId);
      }

      this._travelAndWorkTotalHrs = calculateSummaryLabor(data);
      
      this.loading = false;

      let d = this._groupMyData(data);

      this.groupArrays = d.groupArrays;

      let firstDay = this.firstDay = this.getFirstDayOfEvents(data);
      let lastDay = this.lastDay = this.getLastDayOfEvents(data);

      let totalDays = this.totalDays = this.getTotalDays(firstDay, lastDay)

      this.expandTimeLine()

      if (letNavigate)
        this.eventInstance.inst.navigate(firstDay);
      this.refDate = moment(firstDay).format('YYYY-MM-DD')

      this.data = this.getNestedChildren(data)

      if (refresh)
        this.eventInstance.inst.navigate(firstDay);


      let events = []
      
      // Add regular events
      for (let i = 0; i < data.length; i++) {
        if (data[i].projectStart && data[i].projectFinish)
          events.push({
            start: data[i].projectStart,
            end: data[i].projectFinish,
            title: data[i].event_name,
            time: data[i].time,
            tooltip: ` ${moment(data[i].projectStart).format('hh:mm a')} - ${moment(data[i].projectFinish).format('hh:mm a')} \nTotal Time: ${data[i].time} \n${data[i].event_name} \n-${data[i].description}`,
            color: '#2271B1',
            taskType: 'material-repeat',
            resource: 1,
            id: data[i].id,
            eventType: 'work'
          })
      }

      // Add receipt events if showing receipts
      if (this.isShowingReceipts && receipts.length > 0) {
        for (let receipt of receipts) {
          // Create receipt event timestamp
          let receiptTime;
          if (receipt.time && receipt.time !== 'null') {
            receiptTime = moment(receipt.date + ' ' + receipt.time);
          } else {
            receiptTime = moment(receipt.date + ' 12:00'); // Default to noon if no time
          }

          // Find the corresponding work event for this receipt
          let correspondingEvent = data.find(event => {
            if (!event.projectStart || !event.projectFinish) return false;
            const eventStart = moment(event.projectStart);
            const eventEnd = moment(event.projectFinish);
            return receiptTime.isBetween(eventStart, eventEnd, null, '[]');
          });

          // Determine receipt color based on placement
          let receiptColor = '#28a745'; // Green for receipts within events
          let receiptTitle = `Receipt: ${receipt.vendor_name || 'Unknown Vendor'}`;
          let receiptTooltip = `${receipt.vendor_name || 'Unknown Vendor'}\n${receiptTime.format('hh:mm a')}\nAmount: $${receipt.cost}\n${receipt.description || ''}`;

          if (!correspondingEvent) {
            receiptColor = '#ffc107'; // Yellow/orange for receipts outside events
            receiptTitle = `⚠ ${receiptTitle}`;
            receiptTooltip = `⚠ Outside Event Times\n${receiptTooltip}`;
          }

          // Create a short duration event for the receipt (15 minutes)
          events.push({
            start: receiptTime.toISOString(),
            end: receiptTime.clone().add(15, 'minutes').toISOString(),
            title: receiptTitle,
            tooltip: receiptTooltip,
            color: receiptColor,
            taskType: 'receipt',
            resource: 1,
            id: `receipt_${receipt.id}`,
            eventType: 'receipt',
            receiptData: receipt,
            correspondingEventId: correspondingEvent ? correspondingEvent.id : null
          });
        }
      }

      this.myEvents = events;

    } catch (err) {
      this.loading = false;
    }
  }

  getObjectKeys(obj: any): string[] {
  return obj ? Object.keys(obj) : [];
}

  isShowingReceipts = false;
  // Enhanced receipt auditing and placement methods
  getReceiptAuditInfo(): any {
    const auditInfo = {
      totalReceipts: 0,
      receiptsWithinEvents: 0,
      receiptsOutsideEvents: 0,
      receiptsWithoutTime: 0,
      receiptTimeAccuracy: 0,
      receiptsByEventType: {},
      timeDiscrepancies: []
    };

    this.data?.forEach(event => {
      if (event.receipts?.length || event.receiptNoTimes?.length || event.receiptsDate?.length) {
        const eventStart = moment(event.projectStart);
        const eventEnd = moment(event.projectFinish);
        
        // Count receipts within this event
        const receiptsInEvent = event.receipts?.length || 0;
        const receiptsOutside = event.receiptNoTimes?.length || 0;
        const receiptsOnDay = event.receiptsDate?.length || 0;
        
        auditInfo.receiptsWithinEvents += receiptsInEvent;
        auditInfo.receiptsOutsideEvents += receiptsOutside;
        auditInfo.totalReceipts += receiptsOnDay;
        
        // Track by event type
        const eventType = event.event_name || 'Unknown';
        if (!auditInfo.receiptsByEventType[eventType]) {
          auditInfo.receiptsByEventType[eventType] = 0;
        }
        auditInfo.receiptsByEventType[eventType] += receiptsInEvent;
        
        // Check for time discrepancies
        event.receipts?.forEach(receipt => {
          if (receipt.startTime && receipt.time !== 'null') {
            const receiptTime = moment(receipt.startTime);
            if (!receiptTime.isBetween(eventStart, eventEnd, null, '[]')) {
              auditInfo.timeDiscrepancies.push({
                eventName: event.event_name,
                eventTime: `${eventStart.format('HH:mm')} - ${eventEnd.format('HH:mm')}`,
                receiptTime: receiptTime.format('HH:mm'),
                receiptVendor: receipt.vendor_name,
                amount: receipt.cost
              });
            }
          }
        });
      }
    });

    // Calculate accuracy percentage
    auditInfo.receiptTimeAccuracy = auditInfo.totalReceipts > 0 ? 
      Math.round((auditInfo.receiptsWithinEvents / auditInfo.totalReceipts) * 100) : 100;

    return auditInfo;
  }

  getReceiptTimeline(): any[] {
    const timeline = [];
    
    this.groupArrays?.forEach(day => {
      const dayReceipts = [];
      
      day.games?.forEach(event => {
        if (event.receiptsDate?.length) {
          event.receiptsDate.forEach(receipt => {
            const receiptEntry = {
              ...receipt,
              eventName: event.event_name,
              eventStart: event.projectStart,
              eventEnd: event.projectFinish,
              isWithinEvent: this.isReceiptWithinEvent(receipt, event),
              timeDifference: this.getReceiptTimeDifference(receipt, event),
              auditStatus: this.getReceiptAuditStatus(receipt, event)
            };
            dayReceipts.push(receiptEntry);
          });
        }
      });
      
      if (dayReceipts.length > 0) {
        timeline.push({
          date: day.date,
          dateRaw: day.dateRaw,
          receipts: dayReceipts.sort((a, b) => 
            moment(a.startTime || a.date + ' ' + a.time).diff(
              moment(b.startTime || b.date + ' ' + b.time)
            )
          ),
          totalAmount: dayReceipts.reduce((sum, r) => sum + (r.cost || 0), 0),
          eventsOnDay: day.games?.filter(g => g.event_name !== 'Missing times').length || 0
        });
      }
    });
    
    return timeline;
  }

  isReceiptWithinEvent(receipt: any, event: any): boolean {
    if (!receipt.startTime || !event.projectStart || !event.projectFinish) {
      return false;
    }
    
    const receiptTime = moment(receipt.startTime);
    const eventStart = moment(event.projectStart);
    const eventEnd = moment(event.projectFinish);
    
    return receiptTime.isBetween(eventStart, eventEnd, null, '[]');
  }

  getReceiptTimeDifference(receipt: any, event: any): string {
    if (!receipt.startTime || !event.projectStart) {
      return 'No time data';
    }
    
    const receiptTime = moment(receipt.startTime);
    const eventStart = moment(event.projectStart);
    const eventEnd = moment(event.projectFinish);
    
    if (receiptTime.isBefore(eventStart)) {
      const diff = eventStart.diff(receiptTime, 'minutes');
      return `${diff} min before event`;
    } else if (receiptTime.isAfter(eventEnd)) {
      const diff = receiptTime.diff(eventEnd, 'minutes');
      return `${diff} min after event`;
    } else {
      const diff = receiptTime.diff(eventStart, 'minutes');
      return `${diff} min into event`;
    }
  }

  getReceiptAuditStatus(receipt: any, event: any): any {
    const status = {
      level: 'success',
      message: 'Within event time',
      icon: 'ri-check-circle-line'
    };
    
    if (!receipt.startTime || receipt.time === 'null') {
      return {
        level: 'danger',
        message: 'No timestamp',
        icon: 'ri-error-warning-line'
      };
    }
    
    if (!this.isReceiptWithinEvent(receipt, event)) {
      const receiptTime = moment(receipt.startTime);
      const eventStart = moment(event.projectStart);
      const eventEnd = moment(event.projectFinish);
      
      if (receiptTime.isBefore(eventStart)) {
        return {
          level: 'warning',
          message: 'Before event start',
          icon: 'ri-time-line'
        };
      } else if (receiptTime.isAfter(eventEnd)) {
        return {
          level: 'warning',
          message: 'After event end',
          icon: 'ri-time-line'
        };
      }
    }
    
    return status;
  }

  // Enhanced method to get receipts with better context
  getReceiptsWithEventContext(): any[] {
    const receiptsWithContext = [];
    
    this.data?.forEach(event => {
      if (event.receiptsDate?.length) {
        event.receiptsDate.forEach(receipt => {
          receiptsWithContext.push({
            ...receipt,
            eventContext: {
              eventName: event.event_name,
              eventId: event.id,
              eventStart: event.projectStart,
              eventEnd: event.projectFinish,
              eventDuration: this.calculateTotal(event),
              isWithinEvent: this.isReceiptWithinEvent(receipt, event),
              timeDifference: this.getReceiptTimeDifference(receipt, event),
              auditStatus: this.getReceiptAuditStatus(receipt, event)
            }
          });
        });
      }
    });
    
    return receiptsWithContext.sort((a, b) => 
      moment(a.startTime || a.date + ' ' + a.time).diff(
        moment(b.startTime || b.date + ' ' + b.time)
      )
    );
  }

  // Method to get suspicious receipt patterns
  getSuspiciousReceiptPatterns(): any[] {
    const patterns = [];
    const auditInfo = this.getReceiptAuditInfo();
    
    // High-value receipts outside of events
    this.data?.forEach(event => {
      event.receiptNoTimes?.forEach(receipt => {
        if (receipt.cost > 100) { // Configurable threshold
          patterns.push({
            type: 'High-value receipt outside event',
            severity: 'high',
            receipt: receipt,
            event: event.event_name,
            amount: receipt.cost,
            recommendation: 'Verify if this expense should be associated with a different event'
          });
        }
      });
    });
    
    // Multiple receipts at same vendor on same day
    const vendorGroups = {};
    this.getReceiptsWithEventContext().forEach(receipt => {
      const key = `${receipt.vendor_name}_${moment(receipt.date).format('YYYY-MM-DD')}`;
      if (!vendorGroups[key]) {
        vendorGroups[key] = [];
      }
      vendorGroups[key].push(receipt);
    });
    
    Object.values(vendorGroups).forEach((group: any[]) => {
      if (group.length > 1) {
        patterns.push({
          type: 'Multiple receipts same vendor/day',
          severity: 'medium',
          vendor: group[0].vendor_name,
          count: group.length,
          totalAmount: group.reduce((sum, r) => sum + (r.cost || 0), 0),
          recommendation: 'Review for potential duplicates or verify multiple purchases'
        });
      }
    });
    
    // Receipts with unusual timestamps
    auditInfo.timeDiscrepancies.forEach(discrepancy => {
      patterns.push({
        type: 'Time discrepancy',
        severity: 'medium',
        ...discrepancy,
        recommendation: 'Verify receipt timestamp accuracy'
      });
    });
    
    return patterns;
  }

  // Method to generate receipt audit report
  generateReceiptAuditReport(): any {
    const auditInfo = this.getReceiptAuditInfo();
    const timeline = this.getReceiptTimeline();
    const patterns = this.getSuspiciousReceiptPatterns();
    
    return {
      summary: auditInfo,
      timeline: timeline,
      suspiciousPatterns: patterns,
      recommendations: this.getReceiptRecommendations(auditInfo, patterns),
      generatedAt: moment().toISOString(),
      workOrderId: this.workOrderId
    };
  }

  getReceiptRecommendations(auditInfo: any, patterns: any[]): string[] {
    const recommendations = [];
    
    if (auditInfo.receiptTimeAccuracy < 80) {
      recommendations.push('Improve receipt timestamp accuracy by taking photos immediately during purchases');
    }
    
    if (auditInfo.receiptsOutsideEvents > auditInfo.receiptsWithinEvents) {
      recommendations.push('Review event scheduling to better align with expense periods');
    }
    
    if (patterns.some(p => p.severity === 'high')) {
      recommendations.push('Immediate attention required for high-severity receipt patterns');
    }
    
    if (auditInfo.receiptsWithoutTime > 0) {
      recommendations.push('Ensure all receipts include timestamp information');
    }
    
    return recommendations;
  }

  // Enhanced showReceipts method with better audit integration
  async showReceipts() {
    this.isShowingReceipts = !this.isShowingReceipts;
    
    // Refresh the timeline to include/exclude receipts
    await this.getData(false, false, true);
    
    if (!this.isShowingReceipts) {
      // If hiding receipts, also update the grouped data
      let receipts: any = [];
      let data = this.originalData;

      for (let i = 0; i < data.length; i++) {
        data[i].receiptsDate = [];
        data[i].receipts = [];
        data[i].receiptNoTimes = [];
        data[i].receiptAuditInfo = {
          totalReceipts: 0,
          receiptsInEvent: 0,
          receiptsOutsideEvent: 0,
          totalAmount: 0,
          averageAmount: 0,
          suspiciousCount: 0
        };
      }

      let d = this._groupMyData(data);
      this.groupArrays = d.groupArrays;
      return;
    }

    // Rest of existing showReceipts logic...
    let receipts: any = [];
    if (this.isShowingReceipts) {
      receipts = await this.tripExpenseService.getByWorkOrderId(this.workOrderId);
    }

    let data = this.originalData;

    for (let i = 0; i < data.length; i++) {
      data[i].receiptsDate = [];
      data[i].receipts = [];
      data[i].receiptNoTimes = [];
      data[i].receiptAuditInfo = {
        totalReceipts: 0,
        receiptsInEvent: 0,
        receiptsOutsideEvent: 0,
        totalAmount: 0,
        averageAmount: 0,
        suspiciousCount: 0
      };

      let startTime = data[i].startTime = moment(data[i].projectStart);
      let endTime = moment(data[i].projectFinish);
      
      for (let ii = 0; ii < receipts.length; ii++) {
        if (moment(data[i].projectStart).format('YYYY-MM-DD') == moment(receipts[ii].date).format('YYYY-MM-DD')) {
          
          // Handle null/missing time
          if (receipts[ii].time == 'null' || !receipts[ii].time) {
            receipts[ii].startTime = moment(receipts[ii].date + ' 12:00');
            receipts[ii].time = '12:00';
            receipts[ii].hasValidTime = false;
          } else {
            receipts[ii].startTime = moment(receipts[ii].date + ' ' + receipts[ii].time);
            receipts[ii].hasValidTime = true;
          }

          // Add audit information to receipt
          receipts[ii].auditInfo = {
            isWithinEvent: false,
            timeDifference: 'N/A',
            eventAssociation: data[i].event_name,
            suspiciousFlags: []
          };

          data[i].receiptsDate.push(receipts[ii]);
          data[i].receiptAuditInfo.totalReceipts++;
          data[i].receiptAuditInfo.totalAmount += receipts[ii].cost || 0;

          // Check if receipt is within event timeframe
          if (receipts[ii].hasValidTime && 
              receipts[ii].startTime.isSameOrAfter(startTime) && 
              receipts[ii].startTime.isSameOrBefore(endTime)) {
            
            data[i].receipts.push(receipts[ii]);
            data[i].receiptAuditInfo.receiptsInEvent++;
            receipts[ii].auditInfo.isWithinEvent = true;
            receipts[ii].auditInfo.timeDifference = receipts[ii].startTime.diff(startTime, 'minutes') + ' min into event';
            
          } else {
            data[i].receiptNoTimes.push(receipts[ii]);
            data[i].receiptAuditInfo.receiptsOutsideEvent++;
            
            if (receipts[ii].hasValidTime) {
              if (receipts[ii].startTime.isBefore(startTime)) {
                receipts[ii].auditInfo.timeDifference = startTime.diff(receipts[ii].startTime, 'minutes') + ' min before event';
              } else {
                receipts[ii].auditInfo.timeDifference = receipts[ii].startTime.diff(endTime, 'minutes') + ' min after event';
              }
            }
          }

          // Add suspicious flags
          if (receipts[ii].cost > 200) {
            receipts[ii].auditInfo.suspiciousFlags.push('High amount');
            data[i].receiptAuditInfo.suspiciousCount++;
          }
          
          if (!receipts[ii].hasValidTime) {
            receipts[ii].auditInfo.suspiciousFlags.push('No timestamp');
            data[i].receiptAuditInfo.suspiciousCount++;
          }
        }
      }

      // Calculate averages
      if (data[i].receiptAuditInfo.totalReceipts > 0) {
        data[i].receiptAuditInfo.averageAmount = 
          data[i].receiptAuditInfo.totalAmount / data[i].receiptAuditInfo.totalReceipts;
      }
    }

    let d = this._groupMyData(data);
    this.groupArrays = d.groupArrays;
  }

  addWorkDetail(startDate?, row?) {
    if (startDate) {
      const b = row.games.filter((item) => item.event_name !== 'Missing times')
      let lastRow = b[b?.length - 1];
      startDate = lastRow.projectFinish || lastRow.projectStart
    }

    const modalRef = this.workInfoService.open(this.workOrderId, null, startDate)
    modalRef.result.then(async (result: any) => {
      await this.getData();
    }, () => { });
  }

  openWorkInfo(id) {
    const modalRef = this.workInfoService.open(this.workOrderId, id)
    modalRef.result.then(async (result: any) => {
      await this.getData(true, false);
    }, () => {
    });
  }

  otherTickets: Array<{ id: string, name: string }> = [];
  selectedSourceTicketId: string | null = null;
  sourceTicketRecords: any = [];
  selectAllRecords: boolean = false;
  copyErrors: string[] = [];
  copySuccessCount: number = 0;

  async notifyParent($event) {
    if (!$event.id) return;
    this.selectedSourceTicketId = $event.workOrderId; // Use workOrderId (ticket ID), not the job search result ID
    this.sourceTicketRecords = await this.fieldServiceMobileService.getEventByWorkOrderId($event.workOrderId);
  }


  async openCopyFromTicketModal(id?: string) {
    // Load tickets except current
    this.otherTickets = [
      { id: 'TICKET001', name: 'Ticket #001' },
      { id: 'TICKET002', name: 'Ticket #002' }
    ];



    console.log(this.otherTickets)

    // For demo, use dummy data:
    this.selectedSourceTicketId = null;
    this.selectAllRecords = false;
    this.modalService.open(this.copyFromTicketModal, { size: 'lg', windowClass: 'overflow-visible-modal'});
  }

  async onSourceTicketChange() {
    this.sourceTicketRecords = [];
    this.selectAllRecords = false;
    if (!this.selectedSourceTicketId) return;
    // this.sourceTicketRecords = await this.ticketService.getTicketRecords(this.selectedSourceTicketId);
    // For demo, use dummy data:
    this.sourceTicketRecords = [
      { id: 1, event_name: 'Travel', description: 'Travel to site', projectStart: new Date(), projectFinish: new Date(), _selected: false },
      { id: 2, event_name: 'Work', description: 'Repair', projectStart: new Date(), projectFinish: new Date(), _selected: false }
    ];
  }

  toggleSelectAllRecords() {
    if (!this.sourceTicketRecords) return;
    for (const rec of this.sourceTicketRecords) {
      rec._selected = this.selectAllRecords;
    }
  }

  hasSelectedRecords(): boolean {
    return this.sourceTicketRecords?.some(r => r._selected);
  }

  async copySelectedRecords(modalRef: any) {
    const selected = this.sourceTicketRecords.filter(r => r._selected);
    if (!selected.length) return;

    this.copyErrors = [];
    this.copySuccessCount = 0;

    // Add copiedFromTicketId to each copied record
    const copiedRecords = selected.map(r => ({
      ...r,
      workOrderId: this.workOrderId, // Ensure the copied records are linked to the current work order
      // Add any other necessary fields here
      copiedFromTicketId: this.selectedSourceTicketId // This is the source ticket's workOrderId
    }));

    // Recommended: loop and save each record (or use a batch API if available)
    for (const record of copiedRecords) {
      try {
        delete record._selected; // Remove temporary field before saving
        delete record.id; // Remove existing ID if copying from another ticket
        await this.fieldServiceMobileService.createEvent(record);
        this.copySuccessCount++;
      } catch (error) {
        this.copyErrors.push(`Failed to copy "${record.event_name || 'Unknown Event'}": ${error.message || 'Unknown error'}`);
      }
    }

    await this.getData(true, false);
    
    // Show summary message
    if (this.copyErrors.length === 0) {
      // All successful - close modal
      modalRef.close();
    } else {
      // Some or all failed - keep modal open to show errors
      // Modal will show the errors via copyErrors array
    }
  }

  // Tab management
  activeTab: string = 'details';

  onTabSwitch(tab: string) {
    this.activeTab = tab;
    // Refresh or reload data if needed
    if (tab === 'details') {
      this.getData(true, false, true);
    }
    if (tab === 'timeline') {
      this.getData(true, false, true);
    }
  }

  // Add missing methods referenced in the HTML template
  
  getEventTypeSummary(): any[] {
    const eventTypes = {};
    this.data?.forEach(event => {
      const type = event.event_name || 'Unknown';
      if (!eventTypes[type]) {
        eventTypes[type] = 0;
      }
      if (event.include_calculation) {
        eventTypes[type] += event.mins || 0;
      }
    });
    
    return Object.keys(eventTypes).map(name => ({
      name,
      hours: this.timeConvert(eventTypes[name], 'short')
    })).sort((a, b) => {
      // Sort by total minutes in descending order
      const aMinutes = eventTypes[a.name] || 0;
      const bMinutes = eventTypes[b.name] || 0;
      return bMinutes - aMinutes;
    }).slice(0, 5); // Show top 5 event types
  }

  getProgressPercentage(minutes: number): number {
    const maxHours = 8 * 60; // 8 hours in minutes
    return Math.min(100, (minutes / maxHours) * 100);
  }

  getTotalEvents(): number {
    return this.data?.length || 0;
  }

  getBillableEvents(): number {
    return this.data?.filter(event => event.include_calculation === 1)?.length || 0;
  }

  getNonBillableEvents(): number {
    return this.data?.filter(event => event.include_calculation === 0)?.length || 0;
  }

  getMissingTimeEvents(): number {
    return this.data?.filter(event => 
      event.event_name === 'Missing times' || 
      !event.projectStart || 
      !event.projectFinish
    )?.length || 0;
  }

  getCopiedEvents(): number {
    return this.data?.filter(event => event.copiedFromTicketId)?.length || 0;
  }

  getAverageHoursPerDay(): number {
    if (!this.groupArrays?.length) return 0;
    const totalMinutes = this.groupArrays.reduce((sum, day) => sum + (day.groupTotal || 0), 0);
    return (totalMinutes / 60) / this.groupArrays.length;
  }

  getRecentEvents(): any[] {
    return this.data?.slice(-5).reverse() || [];
  }

  hasTimeGaps(): boolean {
    return this.minsMissing?.some(gaps => gaps.length > 0) || false;
  }

  hasOverlaps(): boolean {
    return this.groupArrays?.some(day => {
      const overlaps = this.checkDateTimeOverlap(day.testData1 || []);
      return overlaps.isOverlap;
    }) || false;
  }

  // Enhanced methods for sidebar functionality with overlap detection
  getTimeDiscrepancies(): any[] {
    const issues = [];
    
    this.groupArrays?.forEach(day => {
      if (day.minutes > 0) {
        issues.push({
          date: day.date,
          description: `Missing time periods detected`,
          missingTime: `${Math.round(day.minutes)} minutes`,
          type: 'gap',
          day: day
        });
      }
      
      // Check for overlaps in the day with improved logic
      const overlaps = this.checkDateTimeOverlap(day.testData1 || []);
      if (overlaps.isOverlap && overlaps.dates?.length > 0) {
        const overlappingEvents = this.getOverlappingEventDetails().filter(conflict => conflict.day === day);
        
        issues.push({
          date: day.date,
          description: `Time overlaps found between ${overlappingEvents.length} event pair(s)`,
          overlaps: overlaps.dates,
          overlappingEvents: overlappingEvents,
          type: 'overlap',
          day: day
        });
      }
      
      // Check for events without times
      const eventsWithoutTimes = day.games?.filter(event => 
        !event.projectStart || !event.projectFinish || 
        event.event_name === 'Missing times'
      );
      
      if (eventsWithoutTimes?.length > 0) {
        issues.push({
          date: day.date,
          description: `${eventsWithoutTimes.length} events without proper start/end times`,
          type: 'incomplete',
          events: eventsWithoutTimes,
          day: day
        });
      }
    });
    
    return issues;
  }

  getOverlappingEventDetails(): any[] {
    const conflicts = [];
    
    this.groupArrays?.forEach(day => {
      const overlaps = this.checkDateTimeOverlap(day.testData1 || []);
      if (overlaps.isOverlap && overlaps.dates?.length > 0) {
        
        overlaps.dates.forEach(overlap => {
          // Find the actual events that are overlapping for this specific overlap period
          const eventsInOverlap = day.games?.filter(event => {
            if (event.event_name === 'Missing times') return false;
            
            const eventStart = moment(event.projectStart);
            const eventEnd = moment(event.projectFinish);
            const overlapStart = moment(overlap.from);
            const overlapEnd = moment(overlap.to);
            
            // Check if this event overlaps with the overlap period
            return eventStart.isBefore(overlapEnd) && eventEnd.isAfter(overlapStart);
          }) || [];
          
          if (eventsInOverlap.length >= 2) {
            const overlapDuration = this.getOverlapDuration(overlap.from, overlap.to);
            
            // Check if we already have this conflict (avoid duplicates)
            const existingConflict = conflicts.find(c => 
              c.date === day.date && 
              c.events.length === eventsInOverlap.length &&
              c.events.every(e => eventsInOverlap.find(eo => eo.id === e.id))
            );
            
            if (!existingConflict) {
              conflicts.push({
                date: day.date,
                events: eventsInOverlap,
                overlapPeriod: overlap,
                overlapDuration: overlapDuration,
                day: day
              });
            }
          }
        });
      }
    });
    
    return conflicts;
  }

  getDayOverlapCount(day: any): number {
    const overlaps = this.checkDateTimeOverlap(day.testData1 || []);
    return overlaps.dates?.length || 0;
  }

  getOverlappingEventsCount(): number {
    let totalOverlappingEvents = 0;
    
    this.groupArrays?.forEach(day => {
      // Get all events for this day that have valid start/end times
      const validEvents = day.games?.filter(event => 
        event.event_name !== 'Missing times' && 
        event.projectStart && 
        event.projectFinish
      ) || [];
      
      if (validEvents.length < 2) return; // Need at least 2 events to have overlaps
      
      const overlappingEventIds = new Set();
      
      // Check each event against every other event
      for (let i = 0; i < validEvents.length; i++) {
        for (let j = i + 1; j < validEvents.length; j++) {
          const event1 = validEvents[i];
          const event2 = validEvents[j];
          
          const start1 = moment(event1.projectStart);
          const end1 = moment(event1.projectFinish);
          const start2 = moment(event2.projectStart);
          const end2 = moment(event2.projectFinish);
          
          // Check if the time ranges overlap: start1 < end2 && start2 < end1
          const hasOverlap = start1.isBefore(end2) && start2.isBefore(end1);
          
          if (hasOverlap) {
            // Calculate overlap duration to ensure it's meaningful (more than 1 minute)
            const overlapStart = moment.max(start1, start2);
            const overlapEnd = moment.min(end1, end2);
            const overlapDuration = overlapEnd.diff(overlapStart, 'minutes');
            
            if (overlapDuration > 1) {
              // Both events are overlapping
              if (event1.id) overlappingEventIds.add(event1.id);
              if (event2.id) overlappingEventIds.add(event2.id);
            }
          }
        }
      }
      
      totalOverlappingEvents += overlappingEventIds.size;
    });
    
    return totalOverlappingEvents;
  }

  // Enhanced method to get detailed overlap information
  getOverlapDetails(): any[] {
    const overlaps = [];
    
    this.groupArrays?.forEach(day => {
      const validEvents = day.games?.filter(event => 
        event.event_name !== 'Missing times' && 
        event.projectStart && 
        event.projectFinish
      ) || [];
      
      if (validEvents.length < 2) return;
      
      // Check each event against every other event
      for (let i = 0; i < validEvents.length; i++) {
        for (let j = i + 1; j < validEvents.length; j++) {
          const event1 = validEvents[i];
          const event2 = validEvents[j];
          
          const start1 = moment(event1.projectStart);
          const end1 = moment(event1.projectFinish);
          const start2 = moment(event2.projectStart);
          const end2 = moment(event2.projectFinish);
          
          // Check if the time ranges overlap
          const hasOverlap = start1.isBefore(end2) && start2.isBefore(end1);
          
          if (hasOverlap) {
            const overlapStart = moment.max(start1, start2);
            const overlapEnd = moment.min(end1, end2);
            const overlapDuration = overlapEnd.diff(overlapStart, 'minutes');
            
            if (overlapDuration > 1) {
              overlaps.push({
                day: day.date,
                event1: {
                  id: event1.id,
                  name: event1.event_name,
                  start: event1.projectStart,
                  end: event1.projectFinish
                },
                event2: {
                  id: event2.id,
                  name: event2.event_name,
                  start: event2.projectStart,
                  end: event2.projectFinish
                },
                overlapStart: overlapStart.toISOString(),
                overlapEnd: overlapEnd.toISOString(),
                overlapDuration: overlapDuration
              });
            }
          }
        }
      }
    });
    
    return overlaps;
  }

  // Method to check if a specific event overlaps with any other event
  hasEventOverlaps(eventId: string): boolean {
    const overlaps = this.getOverlapDetails();
    return overlaps.some(overlap => 
      overlap.event1.id === eventId || overlap.event2.id === eventId
    );
  }

  // Method to get all events that are involved in overlaps
  getOverlappingEvents(): any[] {
    const overlaps = this.getOverlapDetails();
    const overlappingEventIds = new Set();
    
    overlaps.forEach(overlap => {
      overlappingEventIds.add(overlap.event1.id);
      overlappingEventIds.add(overlap.event2.id);
    });
    
    return this.data?.filter(event => overlappingEventIds.has(event.id)) || [];
  }

  // Enhanced overlap duration calculation
  getOverlapDuration(from: any, to: any): string {
    const duration = moment.duration(moment(to).diff(moment(from)));
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Quick fix methods
  async quickFixGap(issue: any) {
    const { value: confirm } = await SweetAlert.fire({
      title: 'Fill Time Gap',
      html: `
        <div class="text-start">
          <p class="mb-3">Fill the missing time gap on <strong>${issue.date}</strong>:</p>
          <div class="alert alert-info border-0 mb-3">
            <i class="ri-time-line me-1"></i>
            Missing time: <strong>${issue.missingTime}</strong>
          </div>
          <p class="mb-0">This will create a "Work" event to fill the gap. Continue?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Fill Gap',
      cancelButtonText: 'Cancel'
    });

    if (confirm) {
      // Implementation would create events to fill gaps
      console.log('Filling gap for:', issue);
      // Add actual gap-filling logic here
    }
  }

  async quickFixOverlap(issue: any) {
    const { value: confirm } = await SweetAlert.fire({
      title: 'Resolve Time Overlap',
      html: `
        <div class="text-start">
          <p class="mb-3">Resolve overlapping times on <strong>${issue.date}</strong>:</p>
          <div class="alert alert-warning border-0 mb-3">
            <i class="ri-overlap-2-line me-1"></i>
            Found <strong>${issue.overlaps.length} overlap(s)</strong>
          </div>
          <p class="mb-0">This will automatically adjust event times to remove overlaps. Continue?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Fix Overlap',
      cancelButtonText: 'Cancel'
    });

    if (confirm) {
      // Implementation would resolve overlaps
      console.log('Fixing overlap for:', issue);
      // Add actual overlap resolution logic here
    }
  }

  navigateToIssue(issue: any) {
    // Switch to details tab and scroll to the specific day
    this.activeTab = 'details';
    setTimeout(() => {
      // Scroll to the day section
      const dayElement = document.querySelector(`[data-date="${issue.day?.dateRaw}"]`);
      if (dayElement) {
        dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // If the issue has a specific event (e.g., for overlaps or incomplete events), scroll to the event row
      if (issue.events && issue.events.length > 0) {
        // Try to scroll to the first event in the issue
        const eventId = issue.events[0]?.id;
        if (eventId) {
          const eventRow = document.querySelector(`[data-event-id="${eventId}"]`);
          if (eventRow) {
            eventRow.classList.add('table-warning');
            eventRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => eventRow.classList.remove('table-warning'), 2000);
          }
        }
      }
    }, 100);
  }

  autoResolveOverlap(conflict: any) {
    SweetAlert.fire({
      title: 'Auto-Resolve Overlap',
      html: `
        <div class="text-start">
          <p class="mb-3">Automatically resolve overlap between:</p>
          <ul class="mb-3">
            ${conflict.events.map(e => `<li><strong>${e.event_name}</strong></li>`).join('')}
          </ul>
          <p class="mb-0">Choose resolution strategy:</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Adjust End Times',
      cancelButtonText: 'Cancel',
      showDenyButton: true,
      denyButtonText: 'Adjust Start Times'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Adjusting end times for:', conflict);
        // Implement end time adjustment
      } else if (result.isDenied) {
        console.log('Adjusting start times for:', conflict);
        // Implement start time adjustment
      }
    });
  }

  showOverlapDetails(conflict: any) {
    const eventDetails = conflict.events.map(e => 
      `<div class="border rounded p-2 mb-2">
        <strong>${e.event_name}</strong><br>
        <small>${moment(e.projectStart).format('MM/DD/YYYY HH:mm')} - ${moment(e.projectFinish).format('MM/DD/YYYY HH:mm')}</small>
      </div>`
    ).join('');

    SweetAlert.fire({
      title: 'Overlap Details',
      html: `
        <div class="text-start">
          <p class="mb-3">Overlapping events on <strong>${conflict.date}</strong>:</p>
          ${eventDetails}
          <div class="alert alert-warning border-0 mt-3">
            <strong>Overlap Duration:</strong> ${conflict.overlapDuration}
          </div>
        </div>
      `,
      confirmButtonText: 'Close',
      width: '500px'
    });
  }

  async showAllTimeIssues() {
    const issues = this.getTimeDiscrepancies();
    const issueList = issues.map(issue => 
      `<li><strong>${issue.date}:</strong> ${issue.description}</li>`
    ).join('');

    const { value: action } = await SweetAlert.fire({
      title: 'All Time Issues',
      html: `
        <div class="text-start">
          <p class="mb-3">Found ${issues.length} time-related issues:</p>
          <ul class="mb-3">${issueList}</ul>
          <p class="mb-0">Choose an action:</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Fix All Automatically',
      cancelButtonText: 'Review Manually',
      showDenyButton: true,
      denyButtonText: 'Export Report'
    });

    if (action) {
      console.log('Auto-fixing all issues:', issues);
      // Implement bulk fix logic
    } else if (action === false) {
      this.activeTab = 'details';
    }
  }

  // Quick action methods
  async fixTimeGaps() {
    const gaps = this.getTimeDiscrepancies().filter(issue => issue.type === 'gap');
    if (!gaps.length) return;

    const { value: confirm } = await SweetAlert.fire({
      title: 'Fix Time Gaps',
      html: `
        <div class="text-start">
          <p class="mb-3">Found ${gaps.length} day(s) with time gaps:</p>
          <ul class="small mb-3">
            ${gaps.map(gap => `<li>${gap.date}: ${gap.missingTime}</li>`).join('')}
          </ul>
          <p class="mb-0">Would you like to automatically create "Work" events to fill these gaps?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Fix Gaps',
      cancelButtonText: 'Cancel'
    });

    if (confirm) {
      // Implementation would create events to fill gaps
      console.log('Fixing time gaps...', gaps);
      // You would implement the actual gap-filling logic here
    }
  }

  async resolveOverlaps() {
    const overlaps = this.getTimeDiscrepancies().filter(issue => issue.type === 'overlap');
    if (!overlaps.length) return;

    const { value: confirm } = await SweetAlert.fire({
      title: 'Resolve Time Overlaps',
      html: `
        <div class="text-start">
          <p class="mb-3">Found ${overlaps.length} day(s) with overlapping events:</p>
          <ul class="small mb-3">
            ${overlaps.map(overlap => `<li>${overlap.date}: ${overlap.overlaps?.length} overlap(s)</li>`).join('')}
          </ul>
          <p class="mb-0">Would you like to review and adjust these overlapping times?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Review Overlaps',
      cancelButtonText: 'Cancel'
    });

    if (confirm) {
      // Implementation would help resolve overlaps
      console.log('Resolving overlaps...', overlaps);
      // You would implement overlap resolution logic here
    }
  }

  // Modal methods for showing receipt audit details
  async showSuspiciousPatterns() {
    const patterns = this.getSuspiciousReceiptPatterns();
    
    const patternsList = patterns.map(pattern => 
      `<li><strong>${pattern.type}:</strong> ${pattern.recommendation}</li>`
    ).join('');

    await SweetAlert.fire({
      title: 'Suspicious Receipt Patterns',
      html: `
        <div class="text-start">
          <p class="mb-3">Found ${patterns.length} pattern(s) requiring attention:</p>
          <ul class="mb-3">${patternsList}</ul>
          <div class="alert alert-info border-0">
            <i class="ri-lightbulb-line me-1"></i>
            <strong>Tip:</strong> Review these patterns to ensure expense accuracy and compliance.
          </div>
        </div>
      `,
      confirmButtonText: 'Close',
      width: '600px'
    });
  }

  async showReceiptTimeline() {
    const timeline = this.getReceiptTimeline();
    
    let timelineHtml = timeline.map(day => 
      `<div class="mb-3">
        <h6 class="text-primary">${moment(day.dateRaw).format('MMM DD, YYYY')} - ${day.totalAmount.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</h6>
        ${day.receipts.map(receipt => 
          `<div class="border rounded p-2 mb-1 ${receipt.auditStatus.level === 'success' ? 'border-success' : receipt.auditStatus.level === 'warning' ? 'border-warning' : 'border-danger'}">
            <strong>${receipt.vendor_name || 'Unknown'}</strong> - ${receipt.cost.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
            <br><small class="text-muted">${receipt.time || 'No time'} | ${receipt.eventName} | ${receipt.timeDifference}</small>
            <br><small class="text-${receipt.auditStatus.level === 'success' ? 'success' : receipt.auditStatus.level === 'warning' ? 'warning' : 'danger'}">${receipt.auditStatus.message}</small>
          </div>`
        ).join('')}
      </div>`
    ).join('');

    await SweetAlert.fire({
      title: 'Receipt Timeline',
      html: `
        <div class="text-start" style="max-height: 400px; overflow-y: auto;">
          ${timelineHtml || '<p class="text-muted">No receipts found with timing information.</p>'}
        </div>
      `,
      confirmButtonText: 'Close',
      width: '700px'
    });
  }

  myDefaultEvent() {
    return {
      taskType: 'cogs',
      title: 'Work',
      color: '#2271B1',
      resource: 1,
      eventType: 'work'
    };
  }

}
