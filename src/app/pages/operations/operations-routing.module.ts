import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

import { OverviewComponent } from "./overview/overview.component";
import { OrderLookupPageComponent } from "./order-lookup-page/order-lookup-page.component";
import { PartLookupPageComponent } from "./part-lookup-page/part-lookup-page.component";
import { WoLookupPageComponent } from "./wo-lookup-page/wo-lookup-page.component";
import { AccessGuard } from "@app/core/guards/access.guard";

const routes: Routes = [
  {
    path: "",
    redirectTo: "overview",
    pathMatch: "full",
  },
  {
    title: "Overview",
    path: "overview",
    component: OverviewComponent,
  },
  {
    title: "Order Lookup",
    path: "order-lookup",
    component: OrderLookupPageComponent,
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Part Lookup",
    path: "part-lookup",
    component: PartLookupPageComponent,
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "WO Lookup",
    path: "wo-lookup",
    component: WoLookupPageComponent,
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "reports",
    loadChildren: () =>
      import("./reports/reports-routing.module").then(
        (m) => m.ReportsRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "forms",
    loadChildren: () =>
      import("./forms/forms-routing.module").then((m) => m.FormsRoutingModule),
  },
  {
    path: "maintenance",
    loadChildren: () =>
      import("./maintenance/maintenance-routing.module").then(
        (m) => m.MaintenanceRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "shortages",
    loadChildren: () =>
      import("./shortages/shortages-routing.module").then(
        (m) => m.ShortagesRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "material-request",
    loadChildren: () =>
      import("./material-request/material-request-routing.module").then(
        (m) => m.MaterialRequestRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "logistics",
    loadChildren: () =>
      import("./logistics/logistics-routing.module").then(
        (m) => m.LogisticsRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "graphics",
    loadChildren: () =>
      import("./graphics/graphics-routing.module").then(
        (m) => m.GraphicsRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "physical-inventory",
    loadChildren: () =>
      import("./physical-inventory/physical-inventory-routing.module").then(
        (m) => m.PhysicalInventoryRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "master-scheduling",
    loadChildren: () =>
      import("./master-scheduling/master-scheduling-routing.module").then(
        (m) => m.MasterSchedulingRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "labels",
    loadChildren: () =>
      import("./labels/labels-routing.module").then(
        (m) => m.LabelsRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "org-chart",
    loadChildren: () =>
      import("./org-chart/org-chart-routing.module").then(
        (m) => m.OrgChartRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OperationsRoutingModule {}
