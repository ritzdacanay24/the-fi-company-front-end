import { Routes, RouterModule, ActivatedRouteSnapshot } from "@angular/router";
import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { MapComponent } from "./map/map.component";
import { AccessGuard } from "@app/core/guards/access.guard";

const routes: Routes = [
  {
    path: "",
    redirectTo: "overview",
    pathMatch: "full",
  },
  {
    title: "Overviews",
    path: "overview",
    loadChildren: () =>
      import("./overview/overview-routing.module").then(
        (m) => m.OverviewRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Map",
    path: "map",
    component: MapComponent,
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Reports",
    path: "reports",
    loadChildren: () =>
      import("./report/report-routing.module").then(
        (m) => m.ReportRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Maintenance",
    path: "maintenance",
    loadChildren: () =>
      import("./maintenance/maintenance-routing.module").then(
        (m) => m.MaintenanceRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Jobs",
    path: "jobs",
    loadChildren: () =>
      import("./job/job-routing.module").then((m) => m.JobRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "request",
    loadChildren: () =>
      import("./request/request-routing.module").then(
        (m) => m.RequestRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "ticket",
    loadChildren: () =>
      import("./ticket/ticket-routing.module").then(
        (m) => m.TicketRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "scheduling",
    loadChildren: () =>
      import("./scheduler/scheduler-routing.module").then(
        (m) => m.SchedulerRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "credit-card-transaction",
    loadChildren: () =>
      import(
        "./credit-card-transaction/credit-card-transaction-routing.module"
      ).then((m) => m.CreditCardTransactionRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "parts-order",
    loadChildren: () =>
      import("./parts-order/parts-order-routing.module").then(
        (m) => m.PartsOrderRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "trip-details",
    loadChildren: () =>
      import("./trip-details/trip-details-routing.module").then(
        (m) => m.TripDetailsRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), SharedModule],
  exports: [RouterModule],
})
export class FieldServiceRoutingModule {}
