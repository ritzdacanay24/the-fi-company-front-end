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
  ];

  title = "Scheduled Jobs";

  gridApi: GridApi;

  data: any[];

  id = null;

  runJob(link) {
    window.open(link, "_blank");
  }
}
