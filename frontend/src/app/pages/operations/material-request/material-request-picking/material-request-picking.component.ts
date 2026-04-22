import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import {
  MaterialPickingMessageType,
  MaterialRequestPickingWebsocketService,
} from "@app/core/services/material-request-picking-websocket.service";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";
import { NgxBarcode6Module } from "ngx-barcode6";
import { Subscription, interval } from "rxjs";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { MaterialPickingValidationModalService } from "../material-picking-validation-modal/material-picking-validation-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: "app-material-request-picking",
  templateUrl: "./material-request-picking.component.html",
  styleUrls: [],
})
export class MaterialRequestPickingComponent implements OnInit, OnDestroy {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public api: MaterialRequestService,
    public authenticationService: AuthenticationService,
    private materialRequestPickingWebsocketService: MaterialRequestPickingWebsocketService,
    private materialPickingValidationModalService: MaterialPickingValidationModalService
  ) {}

  title: string = "Material Request Picking";
  icon = "mdi-account-group";
  isLoading = false;
  data;

  subscription: Subscription;
  pickingAddTransactionSubscription: Subscription;
  materialPickingTransactionSubscription: Subscription;

  ngOnInit(): void {
    this.materialRequestPickingWebsocketService.init();
    this.setupWebSocketSubscriptions();
    this.getData();
  }

  ngOnDestroy(): void {
    if (this.subscription) this.subscription.unsubscribe();
    if (this.pickingAddTransactionSubscription)
      this.pickingAddTransactionSubscription.unsubscribe();
    if (this.materialPickingTransactionSubscription)
      this.materialPickingTransactionSubscription.unsubscribe();
    this.materialRequestPickingWebsocketService.destroy();
  }

  setupWebSocketSubscriptions() {
    this.pickingAddTransactionSubscription = this.materialRequestPickingWebsocketService
      .subscribe<any>(MaterialPickingMessageType.PICKING_ADD_TRANSACTION)
      .subscribe((socketMessage) => {
        if (!socketMessage?.data) {
          return;
        }

        const index =
          this.data?.findIndex((x) => x.id == socketMessage.data.id) ?? -1;
        index === -1
          ? this.data.push(socketMessage.data)
          : (this.data = this.data.map((el) =>
              el.id === socketMessage.data.id ? socketMessage.data : el
            ));
      });

    this.materialPickingTransactionSubscription = this.materialRequestPickingWebsocketService
      .subscribe<any>(MaterialPickingMessageType.MATERIAL_PICKING_TRANSACTION)
      .subscribe((socketMessage) => {
        if (!socketMessage?.data || !Array.isArray(this.data)) {
          return;
        }

        this.data = this.data.map((el) =>
          el.id === socketMessage.data.id ? socketMessage.data : el
        );
      });
  }

  updateClock = () => {
    const rows = Array.isArray(this.data) ? this.data : [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.printedDate) {
        rows[i].timeDiff = timeUntil(rows[i].printedDate, rows[i].timeDiff);
      } else {
        rows[i].timeDiff = "";
      }
    }
  };

  async getData(showLoading = true) {
    try {
      this.isLoading = showLoading;
      const data: any = await this.api.getPicking();
      this.data = Array.isArray(data)
        ? data
        : Array.isArray(data?.result)
          ? data.result
          : [];

      if (this.subscription) {
        this.subscription.unsubscribe();
      }
      this.subscription = interval(1000).subscribe(() => this.updateClock());

      this.isLoading = false;
    } catch {
      this.isLoading = false;
    }
  }

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

      this.materialRequestPickingWebsocketService.publish(
        MaterialPickingMessageType.MATERIAL_PICKING_TRANSACTION,
        row,
        "Cleared print"
      );
    } catch {}
  }

  async sendBackToValidation(row) {
    try {
      this.isLoading = true;
      await this.api.sendBackToValidation(row);
      await this.getData(false);

      row.validated = null;
      row.disabled = true;

      this.materialRequestPickingWebsocketService.publish(
        MaterialPickingMessageType.MATERIAL_PICKING_TRANSACTION,
        row,
        "Removed from picking queue"
      );

      this.materialRequestPickingWebsocketService.publish(
        MaterialPickingMessageType.VALIDATE_ADD_TRANSACTION,
        row,
        "Material request returned back to the validation queue."
      );

      this.isLoading = false;
    } catch {
      this.isLoading = false;
      row.disabled = false;
    }
  }

  async onPrint(row) {
    try {
      row.isLoading = true;

      const printedDate = moment().format("YYYY-MM-DD HH:mm:ss");

      for (let i = 0; i < row.details.length; i++) {
        row.details[i].printedBy =
          this.authenticationService.currentUserValue.full_name;
        row.details[i].printedDate = printedDate;
      }

      await this.api.onPrint(row);

      row.printedBy = this.authenticationService.currentUserValue.full_name;
      row.printedDate = printedDate;

      setTimeout(() => {
        const printContents = document.getElementById("pickSheet-" + row.id)
          ?.innerHTML;
        const popupWin = window.open("", "_blank", "width=1000,height=600");
        if (!printContents || !popupWin) {
          return;
        }

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
              body{font-size:12px !important}
              table{font-size: 12px !important}
              p {font-size:12px !important; margin-bottom:2px;}
              thead {font-size:12px !important}
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

      this.materialRequestPickingWebsocketService.publish(
        MaterialPickingMessageType.MATERIAL_PICKING_TRANSACTION,
        row,
        "Material pick sheet printed"
      );
    } catch {
      row.isLoading = false;
    }
  }

  getLineItemShortages(row) {
    const shortageItemsFound = [];
    for (let i = 0; i < row.details.length; i++) {
      if (row.details[i].active == 1) {
        row.details[i].qtyPicked =
          row.details[i].qtyPicked == null ? 0 : row.details[i].qtyPicked;

        const qtyRequired = parseInt(row.details[i].qty);
        const qtyPicked = parseInt(row.details[i].qtyPicked);

        const openBalance = qtyRequired - qtyPicked;
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

    const itemShortagesFound = this.getLineItemShortages(row);

    const modalRef = this.materialPickingValidationModalService.open(row);
    modalRef.componentInstance.shortages = itemShortagesFound;

    modalRef.result.then(
      async () => {
        try {
          row.pickedCompletedDate = moment().format("YYYY-MM-DD HH:mm:ss");
          await this.api.completePicking(row);

          this.materialRequestPickingWebsocketService.publish(
            MaterialPickingMessageType.MATERIAL_PICKING_TRANSACTION,
            row,
            "Material pick sheet completed"
          );

          this.data = this.data.filter((x) => x.id !== row.id);

          SweetAlert.toast({ title: "Pick completed" });
        } catch {}
      },
      () => {}
    );
  }

  isOverdue(dueDate: string): boolean {
    if (!dueDate) return false;
    const due = moment(dueDate);
    const now = moment();
    return now.isAfter(due);
  }

  getPickingUrgency(timeDiff: string): string {
    if (!timeDiff) return "Normal";

    const hoursMatch = timeDiff.match(/(\d+) hours?/);
    const daysMatch = timeDiff.match(/(\d+) Days?/);

    let totalHours = 0;
    if (daysMatch) totalHours += parseInt(daysMatch[1]) * 24;
    if (hoursMatch) totalHours += parseInt(hoursMatch[1]);

    if (totalHours >= 24) return "Critical";
    if (totalHours >= 8) return "High";
    if (totalHours >= 4) return "Medium";
    return "Normal";
  }
}

function timeUntil(s, timeToStart) {
  const now = moment();
  const expiration = moment(s);

  const diff = expiration.diff(now);
  const diffDuration = moment.duration(diff);

  const days = Math.abs(diffDuration.days());
  const hours = Math.abs(diffDuration.hours());
  const mintues = Math.abs(diffDuration.minutes());
  const seconds = Math.abs(diffDuration.seconds());

  return (
    days + " Days " + hours + " hours " + mintues + "  min " + seconds + " sec "
  );
}
