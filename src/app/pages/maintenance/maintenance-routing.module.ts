import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { MaintenanceComponent } from "./maintenance.component";
import { EmailNotificationComponent } from "./email-notification/email-notification.component";

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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MaintenanceRoutingModule {}
