import { Component, Input, OnInit } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service';
import { SerialService } from '@app/core/api/field-service/serial.service';
import { TeamService } from '@app/core/api/field-service/fs-team.service';
import { CrashKitService } from '@app/core/api/field-service/crash-kit.service';
import { CORE_SETTINGS } from '@app/core/constants/app.config';
import { timeConvert, zoneAbbr, sumLaborAndBreakTimes, calculateSummaryLabor } from '@app/pages/field-service/shared/field-service-helpers.service';
import { isDarkTheme } from '@app/shared/config/ag-grid.config';

@Component({
  selector: 'app-print-ticket',
  templateUrl: './print-ticket.component.html',
  styleUrls: ['./print-ticket.component.scss']
})
export class PrintTicketComponent implements OnInit {

  @Input() public ticketId: number;
  @Input() public printDetails: boolean;


  img = CORE_SETTINGS.IMAGE;

  isLoading: boolean;
  data: any;
  _travelAndWorkTotalHrs = 0;


  firstTravelInfo: any[];
  secondTravelInfo: any[];
  workOrderSeq: any[];
  isDarkMode: boolean;
  zoneAbbr: (name: string) => string;
  total: number;
  workOrderInfo: any;

  timeConvert = timeConvert;
  teams: any;
  crashKitDetails: any;

  isDateNull(date, format) {
    return date ? moment(date).format(format) : "";
  }


  constructor(
    private api: FieldServiceMobileService,
    private workOrderService: WorkOrderService,
    private schedulerService: SchedulerService,
    private ngbActiveModal: NgbActiveModal,
    private serialService: SerialService,
    private teamService: TeamService,
    private crashKitService: CrashKitService
  ) {
    this.zoneAbbr = zoneAbbr;
  }

  crashKitDetailsSum = 0;
  async getCrashKit() {
    let data = await this.crashKitService.getByWorkOrderId(this.ticketId);
    this.crashKitDetails = data;
    this.crashKitDetailsSum = this.crashKitDetails.reduce((pv, cv) => {
      pv += cv.qty * cv.price;
      return pv;
    }, 0);

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

  close() {
    this.ngbActiveModal.close()
  }
  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  getNestedChildren(arr, parent?) {
    var out = []
    for (var i in arr) {
      if (arr[i].parent_id == parent) {
        var childs = this.getNestedChildren(arr, arr[i].id)

        if (childs.length) {
          for (let ii = 0; ii < childs.length; ii++) {
            arr[i].break_total += childs[ii].break_total
          }

          arr[i].childs = childs
        }
        out.push(arr[i])
      }
    }
    return out

  }

  
  ngOnInit(): void {
    this.isDarkMode = isDarkTheme();

    this.getData();
    this.getCrashKit();
  }

  reformatData() {
    this.workOrderSeq = [];


    for (var i = 0; i < this.data.length; i++) {
      this.workOrderSeq.push(i + 1)
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


  _groupMyData(data) {
    const groups = data.reduce((groups, game) => {
      const date = moment(game.projectStart).calendar({
        sameDay: '[Today] • ddd, MMM DD, YYYY',
        nextDay: '[Tomorrow] • ddd, MMM DD, YYYY',
        nextWeek: 'dddd, MMM DD, YYYY',
        lastDay: '[Yesterday] • ddd, MMM DD, YYYY',
        lastWeek: 'ddd, MMM DD, YYYY',
        sameElse: 'ddd, MMM DD, YYYY',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(game);
      return groups;
    }, {});

    // Edit: to add it in the array format instead
    let groupArrays = Object.keys(groups).map((date) => {
      let groupTotal = 0
      for (let i = 0; i < groups[date].length; i++) {
        if (groups[date][i].include_calculation == 1) {
          if (groups[date][i].event_name == 'Break') {
            groups[date][i].mins = Math.abs(groups[date][i].mins);
          }
          groupTotal += groups[date][i].mins;
        }
      }

      return {
        groupTotal: groupTotal,
        dateRaw: moment(new Date(date)).format('YYYY-MM-DD'),
        date,
        games: groups[date]
      };

    });

    return { groups, groupArrays }
  }


  installNotes = []
  schedulerNotesComments = [];
  groupArrays = [];
  misc = [];
  jobInfo
  serialInfo
  teamInfo
  async getData() {
    this.installNotes = []
    this.schedulerNotesComments = [];
    this.groupArrays = [];
    this.misc = [];

    this.isLoading = true;
    let data: any = await this.api.getEventViewByWorkOrderId(this.ticketId);
    this.workOrderInfo = await this.workOrderService.getById(this.ticketId);
    this.jobInfo = await this.schedulerService.getByIdRaw(this.workOrderInfo.fs_scheduler_id);
    this.serialInfo = await this.serialService.find({ workOrderId: this.ticketId });
    this.teamInfo = await this.teamService.find({ fs_det_id: this.workOrderInfo.fs_scheduler_id });



    this.data = data;
    data = this.getNestedChildren(data)

    this.reformatData();

    for (let i = 0; i < data.length; i++) {

      if (data[i].event_name == 'Install') {
        if (data[i].description) {
          this.installNotes.push(data[i].description)
        }
      }
      if (data[i].event_name?.includes('Wait')) {
        if (data[i].description) {
          this.installNotes.push(data[i].description)
        }
      }
    }

    if (this.jobInfo.Notes != null && this.jobInfo.Notes != '') {
      this.schedulerNotesComments.push(this.jobInfo.Notes)
    }
    if (this.jobInfo.compliance_license_notes != null && this.jobInfo.compliance_license_notes != '') {
      this.schedulerNotesComments.push(this.jobInfo.compliance_license_notes)
    }
    if (this.jobInfo.comments != null && this.jobInfo.comments != '') {
      this.schedulerNotesComments.push(this.jobInfo.comments)
    }

    if (this.workOrderInfo.workCompleted == 'No') {
      this.schedulerNotesComments.push('Work not completed - ' + this.workOrderInfo.workCompletedComment)
    }

    for (let i = 0; i < this.serialInfo?.length; i++) {
      if (this.serialInfo[i].customerAsset != '' && this.serialInfo[i].eyefiAsset != '') {
        this.misc.push(this.serialInfo[i])
      }
    }

    this.teams = this.teamInfo.map(function (officer) {
      return officer.user
    })


    let ee = data;


    let d = this._groupMyData(data);

    this.groupArrays = d.groupArrays;


    this.data = this.getNestedChildren(data)
    this._travelAndWorkTotalHrs = calculateSummaryLabor(this.data);

    this.total = 0
    for (let i = 0; i < this.data.length; i++) {
      this.total += this.data[i].qtr_hrs
    }
    this.isLoading = false;

  }

  print() {
    setTimeout(() => {
      var printContents = document.getElementById('invoiceWorkOrders').innerHTML;
      var popupWin = window.open('', '_blank', 'width=1000,height=600');
      popupWin.document.open();

      popupWin.document.write(`
      <html>
        <head>
          <title>Ticket Summary</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css">
          <style>
            @page {
              size: portrait;
            }
            @media print {
              tr td {
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              table.report-container {
                page-break-after:auto;
              }
              thead.report-header {
                  display:table-header-group;
              }
              tfoot.report-footer {
                  display:table-footer-group;
              }
              .report-content{
                page-break-inside:avoid;
              }
            }
          </style>
        </head>
        <body onload="window.print();window.close()">${printContents}</body>
      </html>`
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

}
              