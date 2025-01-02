import { GridApi } from "ag-grid-community";
import { Component, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { EmailNotificationService } from "@app/core/api/email-notification/email-notification.component";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule, AgGridModule],
  selector: "app-scheduled-jobs-list",
  templateUrl: "./scheduled-jobs-list.component.html",
})
export class ScheduledJobsListComponent implements OnInit {
  constructor(public api: EmailNotificationService, public router: Router) {}

  ngOnInit(): void {}

  selectedViewOptions = [
    {
      name: "Overdue Orders",
      value: "https://dashboard.eye-fi.com/tasks/overDueOrders.php",
    },
    {
      name: "Work Order Status Report",
      value: "https://dashboard.eye-fi.com/tasks/completedProductionOrders.php",
    },
    {
      name: "Graphics Production",
      selected:
        "https://dashboard.eye-fi.com/tasks/createGraphicsWorkOrder.class.php",
    },
    {
      name: "Overdue Safety Incident's (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_safety_incident.php",
    },
    {
      name: "Overdue CAR's (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_car.php",
    },
    {
      name: "Overdue QIR's (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_qir.php",
    },
    {
      name: "Overdue Shipping Requests (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_shipping_request.php",
    },
    {
      name: "Overdue Shortages (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_shortage_request.php",
    },
    {
      name: "Overdue Field Service Work Orders's (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_field_service_workorder.php",
    },
    {
      name: "Overdue Field Service Invoices's (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_field_service_open_invoice.php",
    },
    {
      name: "Overdue RMA's (Email)",
      selected:
        "https://dashboard.eye-fi.com/tasks/overdue_rma.php",
    },
  ];

  title = "Scheduled Jobs";

  gridApi: GridApi;

  data: any[];

  id = null;

  runJob(link) {
    window.open(link, "_blank");
  }
}
