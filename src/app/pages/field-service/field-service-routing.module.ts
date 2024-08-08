import { Routes, RouterModule } from "@angular/router";
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
    path: "overview",
    loadChildren: () =>
      import("./overview/overview-routing.module").then(
        (m) => m.OverviewRoutingModule
      ),
  },
  {
    path: "map",
    component: MapComponent,
  },
  {
    path: "reports",
    loadChildren: () =>
      import("./report/report-routing.module").then(
        (m) => m.ReportRoutingModule
      ),
  },
  {
    path: "maintenance",
    loadChildren: () =>
      import("./maintenance/maintenance-routing.module").then(
        (m) => m.MaintenanceRoutingModule
      ),
  },
  {
    path: "jobs",
    loadChildren: () =>
      import("./job/job-routing.module").then((m) => m.JobRoutingModule),
  },
  {
    path: "request",
    loadChildren: () =>
      import("./request/request-routing.module").then(
        (m) => m.RequestRoutingModule
      ),
  },
  {
    path: "ticket",
    loadChildren: () =>
      import("./ticket/ticket-routing.module").then(
        (m) => m.TicketRoutingModule
      ),
  },
  {
    path: "scheduling",
    loadChildren: () =>
      import("./scheduler/scheduler-routing.module").then(
        (m) => m.SchedulerRoutingModule
      ),
  },
  {
    path: "credit-card-transaction",
    loadChildren: () =>
      import(
        "./credit-card-transaction/credit-card-transaction-routing.module"
      ).then((m) => m.CreditCardTransactionRoutingModule),
  },
  {
    path: "parts-order",
    loadChildren: () =>
      import("./parts-order/parts-order-routing.module").then(
        (m) => m.PartsOrderRoutingModule
      ),
  },
  {
    path: "trip-details",
    loadChildren: () =>
      import("./trip-details/trip-details-routing.module").then(
        (m) => m.TripDetailsRoutingModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), SharedModule],
  exports: [RouterModule],
})
export class FieldServiceRoutingModule {}
