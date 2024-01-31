import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import moment from 'moment';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { Subscription, interval } from 'rxjs';

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: 'app-material-request-picking',
  templateUrl: './material-request-picking.component.html',
  styleUrls: []
})
export class MaterialRequestPickingComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public api: MaterialRequestService,
    public authenticationService: AuthenticationService
  ) {
  }

  ngOnInit(): void {
    this.getData();
  }

  title: string = 'Material Request Picking';

  icon = 'mdi-account-group';

  isLoading = false;

  data;

  updateClock = () => {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].printedDate) {
        this.data[i].timeDiff = timeUntil(this.data[i].printedDate, this.data[i].timeDiff);
      } else {
        this.data[i].timeDiff = '';
      }
    }
  };

  async onClearPrint(row) {

    try {
      row.clearPrint = true;

      for (let i = 0; i < row.details.length; i++) {
        row.details[i].printedBy = null
        row.details[i].printedDate = null
      }

      await this.api.clearPrint(row);

      row.printedBy = null;
      row.printedDate = null;


    } catch (err) {

    }
  }

  async sendBackToValidation(row) {
    try {
      this.isLoading = true;
      await this.api.sendBackToValidation(row);
      await this.getData()
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }

  }

  subscription: Subscription;

  ngOnDestroy() {
    if (this.subscription)
      this.subscription.unsubscribe();
  }

  async getData() {
    try {
      this.isLoading = true;
      let data: any = await this.api.getPicking();
      this.data = data.result;

      const source = interval(1000);
      this.subscription = source.subscribe(val => this.updateClock());

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onPrint(row) {

    try {
      row.isLoading = true;

      let printedDate = moment().format('YYYY-MM-DD HH:mm:ss');

      for (let i = 0; i < row.details.length; i++) {
        row.details[i].printedBy = this.authenticationService.currentUserValue.full_name
        row.details[i].printedDate = printedDate
      }

      await this.api.onPrint(row);

      row.printedBy = this.authenticationService.currentUserValue.full_name;
      row.printedDate = printedDate;

      setTimeout(() => {
        var printContents = document.getElementById('pickSheet-' + row.id).innerHTML;
        var popupWin = window.open('', '_blank', 'width=1000,height=600');
        popupWin.document.open();

        popupWin.document.write(`
        <html>
          <head>
            <title>Material Request Picking</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
            <style>
            @page {
              size: landscape;
            }
            @media print {
              body{
                  font-size:12px !important
              }
              table{
                font-size: 12px !important
              }
              p {
                font-size:12px !important;
                margin-bottom:2px;
              }
              thead {
                font-size:12px !important
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

    } catch (err) {
      row.isLoading = false;
    }
  }

  async onComplete(row) {
    if (row.printedBy && this.authenticationService.currentUserValue.full_name != row.printedBy) {
      alert('The user who printed this MR is the only person who can complete this MR.')
      return;
    }

    row.pickedCompletedDate = moment().format('YYYY-MM-DD HH:mm:ss');

    for (let i = 0; i < row.details.length; i++) {
      row.details[i].shortageCreatedBy = this.authenticationService.currentUserValue.id
    }

    try {
      await this.api.completePicking(row);
      await this.getData()
    } catch (err) {
    }
  }

}

function timeUntil(s, timeToStart) {
  const now = moment();
  const expiration = moment(s);

  // get the difference between the moments
  const diff = expiration.diff(now);

  //express as a duration
  const diffDuration = moment.duration(diff);

  // display
  let days = Math.abs(diffDuration.days());
  let hours = Math.abs(diffDuration.hours());
  let mintues = Math.abs(diffDuration.minutes());
  let seconds = Math.abs(diffDuration.seconds());

  return days + ' Days ' + hours + ' hours ' + mintues + '  min ' + seconds + ' sec '

}
