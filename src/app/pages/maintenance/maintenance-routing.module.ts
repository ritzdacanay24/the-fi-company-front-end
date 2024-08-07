import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { MaintenanceComponent } from "./maintenance.component";
import { ScheduledJobsListComponent } from "./scheduled-jobs/scheduled-jobs-list/scheduled-jobs-list.component";

const routes: Routes = [
  {
    path: "",
    component: MaintenanceComponent,
    children: [
      {
        path: "user",
        loadChildren: () =>
          import("./user/user-routing.module").then((m) => m.UserRoutingModule),
        data: { preload: true },
      },
      {
        path: "email-notification",
        loadChildren: () =>
          import("./email-notification/email-notification-routing.module").then(
            (m) => m.EmailNotificationRoutingModule
          ),
        data: { preload: true },
      },
      {
        path: "scheduled-jobs",
        component: ScheduledJobsListComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MaintenanceRoutingModule {}
