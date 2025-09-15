import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { FormsComponent } from "./forms.component";
import { AccessGuard } from "@app/core/guards/access.guard";
import { TimeTrackerComponent } from "./time-tracker/time-tracker.component";
import { TimeTrackerListComponent } from "./time-tracker-list/time-tracker-list.component";

const routes: Routes = [
  {
    path: "",
    component: FormsComponent,
    children: [
      {
        title: "Time Tracker",
        path: "time-tracker",
        component: TimeTrackerComponent,
        runGuardsAndResolvers: "always",
      },
      {
        title: "Time Tracker List",
        path: "time-tracker-list",
        component: TimeTrackerListComponent,
        runGuardsAndResolvers: "always",
      },
      {
        title: "Shipping Request",
        path: "shipping-request",
        loadChildren: () =>
          import("./shipping-request/shipping-request-routing.module").then(
            (m) => m.ShippingRequestRoutingModule
          ),
        runGuardsAndResolvers: "always",
      },
      {
        title: "Vehicle Information",
        path: "vehicle",
        loadChildren: () =>
          import("./vehicle/vehicle-routing.module").then(
            (m) => m.VehicleRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        title: "Placard",
        path: "placard",
        loadChildren: () =>
          import("./placard/placard-routing.module").then(
            (m) => m.PlacardRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        title: "IGT Transfer",
        path: "igt-transfer",
        loadChildren: () =>
          import("./igt-transfer/igt-transfer-routing.module").then(
            (m) => m.IgtTransferRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        title: "RFQ",
        path: "rfq",
        loadChildren: () =>
          import("./rfq/rfq-routing.module").then((m) => m.RfqRoutingModule),
        runGuardsAndResolvers: "always",
      },
      {
        title: "Vehicle Inspection",
        path: "vehicle-inspection",
        loadChildren: () =>
          import("./vehicle-inspection/vehicle-inspection-routing.module").then(
            (m) => m.VehicleInspectionRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        title: "Forklift Inspection",
        path: "forklift-inspection",
        loadChildren: () =>
          import(
            "./forklift-inspection/forklift-inspection-routing.module"
          ).then((m) => m.ForkliftInspectionRoutingModule),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        title: "Safety Incident",
        path: "safety-incident",
        loadChildren: () =>
          import("./safety-incident/safety-incident-routing.module").then(
            (m) => m.SafetyIncidentRoutingModule
          ),
        runGuardsAndResolvers: "always",
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FormsRoutingModule {}
