import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

import { OverviewComponent } from "./overview/overview.component";
import { OrderLookupPageComponent } from "./order-lookup-page/order-lookup-page.component";
import { PartLookupPageComponent } from "./part-lookup-page/part-lookup-page.component";
import { WoLookupPageComponent } from "./wo-lookup-page/wo-lookup-page.component";
import { UniversalSearchComponent } from "./universal-search/universal-search.component";
import { AccessGuard } from "@app/core/guards/access.guard";
import { LocationLookupComponent } from "./location-lookup/location-lookup.component";
import { UniversalLookupComponent } from "@app/shared/components/universal-lookup/universal-lookup.component";
import { AllocationManagementComponent } from "./allocation-management/allocation-management.component";

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
    title: "Universal Search",
    path: "universal-lookup",
    component: UniversalLookupComponent,
    runGuardsAndResolvers: "always",
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
    title: "Location Lookup",
    path: "location-lookup",
    component: LocationLookupComponent,
  },
  {
    title: "Work Order Allocation",
    path: "allocation-management",
    component: AllocationManagementComponent,
    runGuardsAndResolvers: "always",
  },
  {
    path: "bom",
    loadChildren: () =>
      import("./bom/bom.module").then((m) => m.BomModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "reports",
    loadChildren: () =>
      import("./reports/reports-routing.module").then(
        (m) => m.ReportsRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "forms",
    loadChildren: () =>
      import("./forms/forms-routing.module").then((m) => m.FormsRoutingModule),
  },
  {
    title: "Parts Request",
    path: "parts-order",
    loadChildren: () =>
      import("../field-service/parts-order/parts-order.module").then(
        (m) => m.PartsOrderModule
      ),
    runGuardsAndResolvers: "always",
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
    runGuardsAndResolvers: "always",
  },
  {
    path: "cycle-time",
    loadChildren: () =>
      import("./cycle-time/cycle-time-routing.module").then(
        (m) => m.CycleTimeRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Serial Number Generator",
    path: "serial-number-generator",
    loadComponent: () =>
      import("../tools/serial-number-demo/serial-number-demo.component").then(
        (m) => m.SerialNumberDemoComponent
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Serial Number Report",
    path: "serial-number-report",
    loadComponent: () =>
      import("../tools/serial-number-report/serial-number-report.component").then(
        (m) => m.SerialNumberReportComponent
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Shipping Readiness",
    path: "shipping-readiness",
    loadComponent: () =>
      import("../../features/sales-order-view/components/shipping-readiness/shipping-readiness.component").then(
        (m) => m.ShippingReadinessComponent
      ),
    runGuardsAndResolvers: "always",
  },
  {
    title: "Shipping Analytics Dashboard",
    path: "shipping-analytics",
    loadComponent: () =>
      import("../../components/shipping-dashboard/shipping-dashboard.component").then(
        (m) => m.ShippingDashboardComponent
      ),
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OperationsRoutingModule {}
