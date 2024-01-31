import { Component, Input, OnInit, SimpleChanges } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap'
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

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    AgGridModule,
    NgbNavModule,
    PrintTicketModule,
    MbscModule
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
    onEventDoubleClick: (args, inst) => {
      this.openWorkInfo(args.event.id)
    },

    onEventCreated: async (event, inst) => {

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
    onEventDragEnd: async (event, inst) => {
    },
    onEventUpdated: async (event, inst) => {

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
    // onEventCreateFailed(args, inst) {
    //   this.myEvents = [...this.myEvents]
    // },
    // onEventUpdateFailed(args, inst) {
    //   this.myEvents = [...this.myEvents]
    // },
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

    let dates = []

    // Step 1 : Convert to Date objects
    const dt_list = dateTimes.map((a, b) => {
      return [new Date(a[0]), new Date(a[1])];
    });

    // Map over arrays of Date values
    const result = dt_list.map((item, index) => {
      let count = 0;
      // Count overlaps with remainder of list
      for (let i = (index + 1); i < dt_list.length; i++) {
        if (Math.max(item[0], dt_list[i][0]) < Math.min(item[1], dt_list[i][1])) {
          dates.push({ from: dt_list[i][0], to: dt_list[i][1] })
          count += 1;
        }
      }
      return count;
    }).reduce((sum, current) => {
      return sum + current;
    }, 0);



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
          include_calculation: 0
        })

        var duration: any = moment.duration(mi[i].until.diff(mi[i].from));
        totalMissingMinutes += duration.asMinutes();

        colors.push({
          start: mi[i].from,
          end: mi[i].until,
          title: "No times found",
          cssClass: 'text-center md-rect-bg'
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


      this._travelAndWorkTotalHrs = calculateSummaryLabor(data);

      // this.websocketService.next({
      //   type: 'fsm_ticket_event',
      //   workOrderId: this.workOrderId,
      //   data: this.data,
      // });

      let events = []
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
            id: data[i].id
          })
      }
      this.myEvents = events;

    } catch (err) {
      this.loading = false;
    }
  }

  isShowingReceipts = false;
  async showReceipts() {
    this.isShowingReceipts = !this.isShowingReceipts;

    let receipts: any = [];
    if (this.isShowingReceipts) {
      receipts = await this.tripExpenseService.getByWorkOrderId(this.workOrderId);
    }


    let data = this.originalData

    for (let i = 0; i < data.length; i++) {
      data[i].receiptsDate = []
      data[i].receipts = []
      data[i].receiptNoTimes = []
      let startTime = data[i].startTime = moment(data[i].projectStart)
      let endTime = moment(data[i].projectFinish)
      for (let ii = 0; ii < receipts.length; ii++) {
        if (moment(data[i].projectStart).format('YYYY-MM-DD') == moment(receipts[ii].date).format('YYYY-MM-DD')) {

          if (receipts[ii].time == 'null') {
            receipts[ii].startTime = '12:00am';
            receipts[ii].time = '12:00am';
          }

          receipts[ii].startTime = moment(receipts[ii].date + ' ' + receipts[ii].time)
          receipts[ii].startTime = moment(receipts[ii].startTime)


          data[i].receiptsDate.push(receipts[ii])
          if (receipts[ii].startTime.isSameOrAfter(startTime) && receipts[ii].startTime.isSameOrBefore(endTime)
          ) {

            data[i].receipts.push(receipts[ii])
          } else {
            data[i].receiptNoTimes.push(receipts[ii])
          }

        }
      }
    }

    let d = this._groupMyData(data);

    this.groupArrays = d.groupArrays;

  }

  myDefaultEvent() {
    return {
      taskType: 'cogs'
    };
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

}
