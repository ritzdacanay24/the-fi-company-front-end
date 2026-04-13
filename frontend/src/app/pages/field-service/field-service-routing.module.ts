import { Routes, RouterModule, ActivatedRouteSnapshot } from "@angular/router";
import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { MapComponent } from "./map/map.component";
import { AccessGuard } from "@app/core/guards/access.guard";
import { UserLocationMapComponent } from "./user-location-map/user-location-map.component";

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
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Map",
    path: "map",
    component: MapComponent,
    runGuardsAndResolvers: "always",
  },
  {
    title: "User Location Map",
    path: "user-location-map",
    component: UserLocationMapComponent,
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Reports",
    path: "reports",
    loadChildren: () =>
      import("./report/report-routing.module").then(
        (m) => m.ReportRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Maintenance",
    path: "maintenance",
    loadChildren: () =>
      import("./maintenance/maintenance-routing.module").then(
        (m) => m.MaintenanceRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    title: "Field Service Jobs",
    path: "jobs",
    loadChildren: () =>
      import("./job/job-routing.module").then((m) => m.JobRoutingModule),
    runGuardsAndResolvers: "always",
  },
  {
    path: "request",
    loadChildren: () =>
      import("./request/request-routing.module").then(
        (m) => m.RequestRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "ticket",
    loadChildren: () =>
      import("./ticket/ticket-routing.module").then(
        (m) => m.TicketRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "scheduling",
    loadChildren: () =>
      import("./scheduler/scheduler-routing.module").then(
        (m) => m.SchedulerRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "credit-card-transaction",
    loadChildren: () =>
      import(
        "./credit-card-transaction/credit-card-transaction-routing.module"
      ).then((m) => m.CreditCardTransactionRoutingModule),
    runGuardsAndResolvers: "always",
  },
  {
    path: "parts-order",
    loadChildren: () =>
      import("./parts-order/parts-order-routing.module").then(
        (m) => m.PartsOrderRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "trip-details",
    loadChildren: () =>
      import("./trip-details/trip-details-routing.module").then(
        (m) => m.TripDetailsRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "customer-visit",
    loadChildren: () =>
      import("./customer-visit/customer-visit-routing.module").then(
        (m) => m.CustomerVisitRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), SharedModule],
  exports: [RouterModule],
})
export class FieldServiceRoutingModule {}
