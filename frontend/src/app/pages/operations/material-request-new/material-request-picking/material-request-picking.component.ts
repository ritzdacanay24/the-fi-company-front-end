import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { WebsocketService } from "@app/core/services/websocket.service";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";
import { NgxBarcode6Module } from "ngx-barcode6";
import { Subscription, interval, fromEvent } from "rxjs";
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
      const result = await SweetAlert.fire({
        title: 'Send Back to Validation?',
        text: 'This will remove the request from picking queue and return it to validation.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, send back',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) return;

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

      SweetAlert.toast({
        title: 'Sent back to validation',
        icon: 'success'
      });

      this.isLoading = false;
    } catch (err) {
      console.error('Error sending back to validation:', err);
      this.isLoading = false;
      row.disabled = false;
      
      SweetAlert.fire({
        title: 'Error',
        text: 'Failed to send back to validation. Please try again.',
        icon: 'error'
      });
    }
  }

  subscription: Subscription;
  keyboardSubscription: Subscription;

  ngOnInit(): void {
    this.getData();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
    if (this.keyboardSubscription) this.keyboardSubscription.unsubscribe();
  }

  setupKeyboardShortcuts() {
    this.keyboardSubscription = fromEvent<KeyboardEvent>(document, 'keydown').subscribe(event => {
      // F5 - Refresh
      if (event.key === 'F5') {
        event.preventDefault();
        this.getData();
      }
      
      // Ctrl+P - Print first active request
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        const activeRow = this.data?.find(row => !row.disabled && !row.printedDate);
        if (activeRow) {
          this.onPrint(activeRow);
        }
      }
      
      // Ctrl+Enter - Complete first printed request
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        const completableRow = this.data?.find(row => row.printedDate && !row.disabled);
        if (completableRow) {
          this.onComplete(completableRow);
        }
      }
    });
  }

  async getData(showLoading = true) {
    try {
      this.isLoading = showLoading;
      let data: any = await this.api.getPicking();
      
      // Filter out rejected items and inactive items from picking queue
      this.data = data.result.map(row => {
        const originalItemCount = row.details.length;
        const filteredDetails = row.details.filter(item => 
          item.active === 1 && 
          item.validation_status !== 'rejected'
        );
        
        return {
          ...row,
          originalItemCount,
          details: filteredDetails
        };
      }).filter(row => row.details.length > 0); // Remove requests with no valid items

      const source = interval(1000);
      this.subscription = source.subscribe((val) => this.updateClock());

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      console.error('Error loading picking data:', err);
      
      SweetAlert.fire({
        title: 'Loading Error',
        text: 'Failed to load picking data. Please refresh the page.',
        icon: 'error'
      });
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

  // Helper methods for validation status display
  getItemRowClass(item: any): string {
    if (item.validation_status === 'pending') return 'table-warning';
    if (item.validation_status === 'approved') return '';
    if (item.validation_status === 'rejected') return 'table-danger';
    return '';
  }

  getValidationStatusBadgeClass(item: any): string {
    switch (item.validation_status) {
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  getValidationStatusText(item: any): string {
    switch (item.validation_status) {
      case 'approved': return '✓';
      case 'rejected': return '✗';
      case 'pending': return '⏳';
      default: return '?';
    }
  }

  getValidationStatusTooltip(item: any): string {
    switch (item.validation_status) {
      case 'approved': return 'Item approved for picking';
      case 'rejected': return 'Item rejected - should not appear in picking';
      case 'pending': return 'Item validation pending';
      default: return 'Unknown validation status';
    }
  }

  async onComplete(row) {
    try {
      // Validation checks
      if (row.printedBy && 
          this.authenticationService.currentUserValue.full_name !== row.printedBy) {
        SweetAlert.fire({
          title: 'Access Denied',
          text: 'Only the user who printed this MR can complete it.',
          icon: 'warning'
        });
        return;
      }
      
      if (row.pickedCompletedDate) {
        SweetAlert.fire({
          title: 'Already Completed',
          text: 'This MR is already completed.',
          icon: 'info'
        });
        return;
      }

      // Check for rejected items that somehow made it through
      const rejectedItems = row.details.filter(item => item.validation_status === 'rejected');
      if (rejectedItems.length > 0) {
        SweetAlert.fire({
          title: 'Invalid Items Found',
          text: `${rejectedItems.length} rejected item(s) found. Please remove them before completing.`,
          icon: 'error'
        });
        return;
      }

      // Set shortage created by for all items
      for (let i = 0; i < row.details.length; i++) {
        row.details[i].shortageCreatedBy = this.authenticationService.currentUserValue.id;
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

            SweetAlert.toast({ 
              title: "Pick completed successfully",
              icon: 'success'
            });
          } catch (err) {
            console.error('Error completing pick:', err);
            SweetAlert.fire({
              title: 'Completion Failed',
              text: 'Failed to complete the pick. Please try again.',
              icon: 'error'
            });
          }
        },
        (dismissed) => {
          // Modal was dismissed/cancelled
          console.log('Pick completion cancelled');
        }
      );
    } catch (err) {
      console.error('Error in onComplete:', err);
      SweetAlert.fire({
        title: 'Error',
        text: 'An unexpected error occurred. Please try again.',
        icon: 'error'
      });
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

  return (
    days + " Days " + hours + " hours " + mintues + "  min " + seconds + " sec "
  );
}
