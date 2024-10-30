import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { MaintenanceComponent } from "./maintenance.component";
import { ScheduledJobsListComponent } from "./scheduled-jobs/scheduled-jobs-list/scheduled-jobs-list.component";
import { AccessGuard } from "@app/core/guards/access.guard";
import { SignaturesComponent } from "./signatures/signatures.component";

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
        path: "signatures",
        component:SignaturesComponent
      },
      {
        path: "email-notification",
        loadChildren: () =>
          import("./email-notification/email-notification-routing.module").then(
            (m) => m.EmailNotificationRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        path: "scheduled-jobs",
        component: ScheduledJobsListComponent,
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        path: "side-menu-config",
        loadChildren: () =>
          import("./side-menu-config/side-menu-config-routing.module").then(
            (m) => m.SideMenuConfigRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MaintenanceRoutingModule {}
