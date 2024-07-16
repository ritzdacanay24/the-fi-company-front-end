import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { WebsocketService } from "@app/core/services/websocket.service";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";
import { NgxBarcode6Module } from "ngx-barcode6";
import { Subscription, interval } from "rxjs";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { MaterialPickingValidationModalService } from "../material-picking-validation-modal/material-picking-validation-modal.component";

const MATERIAL_PICKING_TRANSACTION = "MATERIAL_PICKING_TRANSACTION";
const VALIDATE_ADD_TRANSACTION = "VALIDATE_ADD_TRANSACTION";
const PICKING_ADD_TRANSACTION = "PICKING_ADD_TRANSACTION";

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: "app-material-request-picking",
  templateUrl: "./material-request-picking.component.html",
  styleUrls: [],
})
export class MaterialRequestPickingComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public api: MaterialRequestService,
    public authenticationService: AuthenticationService,
    private websocketService: WebsocketService,
    private materialPickingValidationModalService: MaterialPickingValidationModalService
  ) {
    /**
     * Subscribe to current view.
     * Add subscription
     * If data is found in the array, assign it to the new data
     * If data is not found, push new data
     *
     */
    this.websocketService
      .multiplex(
        () => ({ subscribe: PICKING_ADD_TRANSACTION }),
        () => ({ unsubscribe: PICKING_ADD_TRANSACTION }),
        (message) => message.type === PICKING_ADD_TRANSACTION
      )
      .subscribe((data: any) => {
        var index = this.data.findIndex((x) => x.id == data.data.id);
        index === -1
          ? this.data.push(data.data)
          : (this.data = this.data.map((el) =>
              el.id === data.data.id ? data.data : el
            ));
      });

    /**
     * This should already receive the new array of data
     */
    this.websocketService
      .multiplex(
        () => ({ subscribe: MATERIAL_PICKING_TRANSACTION }),
        () => ({ unsubscribe: MATERIAL_PICKING_TRANSACTION }),
        (message) => message.type === MATERIAL_PICKING_TRANSACTION
      )
      .subscribe((data: any) => {
        this.data = this.data.map((el) =>
          el.id === data.data.id ? data.data : el
        );
      });
  }

  ngOnInit(): void {
    this.getData();
  }

  title: string = "Material Request Picking";

  icon = "mdi-account-group";

  isLoading = false;

  data;

  updateClock = () => {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].printedDate) {
        this.data[i].timeDiff = timeUntil(
          this.data[i].printedDate,
          this.data[i].timeDiff
        );
      } else {
        this.data[i].timeDiff = "";
      }
    }
  };

  async onClearPrint(row) {
    try {
      row.clearPrint = true;

      for (let i = 0; i < row.details.length; i++) {
        row.details[i].printedBy = null;
        row.details[i].printedDate = null;
      }

      await this.api.clearPrint(row);

      row.printedBy = null;
      row.printedDate = null;

      this.websocketService.next({
        message: "Cleared print",
        data: row,
        type: MATERIAL_PICKING_TRANSACTION,
      });
    } catch (err) {}
  }

  async sendBackToValidation(row) {
    try {
      this.isLoading = true;
      await this.api.sendBackToValidation(row);
      await this.getData(false);

      row.validated = null;
      row.disabled = true;

      this.websocketService.next({
        message: "Removed from picking queue",
        type: MATERIAL_PICKING_TRANSACTION,
        data: row,
      });

      this.websocketService.next({
        message: "Material request returned back to the validation queue.",
        type: VALIDATE_ADD_TRANSACTION,
        data: row,
      });

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      row.disabled = false;
    }
  }

  subscription: Subscription;

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  async getData(showLoading = true) {
    try {
      this.isLoading = showLoading;
      let data: any = await this.api.getPicking();
      this.data = data.result;

      const source = interval(1000);
      this.subscription = source.subscribe((val) => this.updateClock());

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onPrint(row) {
    try {
      row.isLoading = true;

      let printedDate = moment().format("YYYY-MM-DD HH:mm:ss");

      for (let i = 0; i < row.details.length; i++) {
        row.details[i].printedBy =
          this.authenticationService.currentUserValue.full_name;
        row.details[i].printedDate = printedDate;
      }

      await this.api.onPrint(row);

      row.printedBy = this.authenticationService.currentUserValue.full_name;
      row.printedDate = printedDate;

      setTimeout(() => {
        var printContents = document.getElementById(
          "pickSheet-" + row.id
        ).innerHTML;
        var popupWin = window.open("", "_blank", "width=1000,height=600");
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
        </html>`);

        popupWin.document.close();

        popupWin.onfocus = function () {
          setTimeout(function () {
            popupWin.focus();
            popupWin.document.close();
          }, 300);
        };
      }, 200);

      this.websocketService.next({
        message: "Material pick sheet printed",
        data: row,
        type: MATERIAL_PICKING_TRANSACTION,
      });
    } catch (err) {
      row.isLoading = false;
    }
  }

  getLineItemShortages(row) {
    let shortageItemsFound = [];
    for (let i = 0; i < row.details.length; i++) {
      // if value is null convert it to 0
      if (row.details[i].active == 1) {
        row.details[i].qtyPicked =
          row.details[i].qtyPicked == null ? 0 : row.details[i].qtyPicked;

        let qtyRequired = parseInt(row.details[i].qty);
        let qtyPicked = parseInt(row.details[i].qtyPicked);

        let openBalance = qtyRequired - qtyPicked;
        if (openBalance > 0) {
          shortageItemsFound.push(row.details[i]);
          row.details[i].shortageQty = openBalance;
        }
      }
    }

    return shortageItemsFound;
  }

  async onComplete(row) {
    if (
      row.printedBy &&
      this.authenticationService.currentUserValue.full_name != row.printedBy
    ) {
      alert(
        "The user who printed this MR is the only person who can complete this MR."
      );
      return;
    }
    if (row.pickedCompletedDate) {
      alert("This MR is already completed.");
      return;
    }

    for (let i = 0; i < row.details.length; i++) {
      row.details[i].shortageCreatedBy =
        this.authenticationService.currentUserValue.id;
    }

    let itemShortagesFound = this.getLineItemShortages(row);

    const modalRef = this.materialPickingValidationModalService.open(row);
    modalRef.componentInstance.shortages = itemShortagesFound;

    modalRef.result.then(
      async (result: any) => {
        try {
          row.pickedCompletedDate = moment().format("YYYY-MM-DD HH:mm:ss");
          await this.api.completePicking(row);

          this.websocketService.next({
            message: "Material pick sheet completed",
            data: row,
            type: MATERIAL_PICKING_TRANSACTION,
          });

          this.data = this.data.filter((x) => x.id !== row.id);

          SweetAlert.toast({ title: "Pick completed" });
        } catch (err) {}
      },
      () => {}
    );
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

  return (
    days + " Days " + hours + " hours " + mintues + "  min " + seconds + " sec "
  );
}
