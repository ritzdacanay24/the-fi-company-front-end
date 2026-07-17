import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { FormsComponent } from "./forms.component";
import { AccessGuard } from "@app/core/guards/access.guard";

const routes: Routes = [
  {
    path: "",
    component: FormsComponent,
    children: [
      {
        title: "Time Tracking",
        path: "time-tracker",
        loadChildren: () =>
          import("./time-tracker/time-tracker-routing.module").then(
            (m) => m.TimeTrackerRoutingModule
          ),
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
        title: "Shipping Checklist",
        path: "shipping-checklist",
        loadComponent: () =>
          import("./shipping-checklist/shipping-checklist.component").then(
            (m) => m.ShippingChecklistComponent
          ),
        runGuardsAndResolvers: "always",
      },
      {
        title: "Shipping Checklist Templates",
        path: "shipping-checklist/templates",
        loadComponent: () =>
          import("./shipping-checklist-template-manager/shipping-checklist-template-manager.component").then(
            (m) => m.ShippingChecklistTemplateManagerComponent
          ),
        runGuardsAndResolvers: "always",
      },
      {
        title: "Shipping Checklist History",
        path: "shipping-checklist/history",
        loadComponent: () =>
          import("./shipping-checklist-history/shipping-checklist-history.component").then(
            (m) => m.ShippingChecklistHistoryComponent
          ),
        runGuardsAndResolvers: "always",
      },
      {
        title: "Shipping Checklist Settings",
        path: "shipping-checklist/settings",
        loadComponent: () =>
          import("./shipping-checklist-settings/shipping-checklist-settings.component").then(
            (m) => m.ShippingChecklistSettingsComponent
          ),
        runGuardsAndResolvers: "always",
      },
      {
        title: "Vehicle Management",
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
        title: "Forklift Management",
        path: "forklift",
        loadChildren: () =>
          import("./forklift/forklift-routing.module").then(
            (m) => m.ForkliftRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        title: "Computer Management",
        path: "computer",
        loadChildren: () =>
          import("./computer/computer-routing.module").then(
            (m) => m.ComputerRoutingModule
          ),
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
