import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

import { ShippingComponent } from "./shipping/shipping.component";
import { MasterSchedulingComponent } from "./master-scheduling.component";
import { PickingRoutingComponent } from "./picking-routing/picking-routing.component";
import { QcRoutingComponent } from "./qc-routing/qc-routing.component";
import { ProductionRoutingComponent } from "./production-routing/production-routing.component";
import { AllRoutingComponent } from "./all-routing/all-routing.component";
import { WorkOrderTrackerComponent } from "./work-order-tracker/work-order-tracker.component";
import { CablesComponent } from "./cables/cables.component";
import { WorkOrderTrackerListComponent } from "./work-order-tracker/work-order-tracker-list/work-order-tracker-list.component";

const routes: Routes = [
  {
    path: "",
    component: MasterSchedulingComponent,
    children: [
      {
        path: "",
        redirectTo: "shipping",
        pathMatch: "full",
      },
      {
        title: "Open Shipment Report",
        path: "shipping",
        component: ShippingComponent,
      },
      {
        title: "Master Production",
        path: "all-routing",
        component: AllRoutingComponent,
      },
      {
        title: "Picking Routing",
        path: "picking-routing",
        component: PickingRoutingComponent,
      },
      {
        title: "Production Routing",
        path: "production-routing",
        component: ProductionRoutingComponent,
      },
      {
        title: "Final Test Routing",
        path: "qc-routing",
        component: QcRoutingComponent,
      },
      {
        path: "work-order-tracker",
        component: WorkOrderTrackerComponent,
      },
      // {
      //   path: "list-work-order-tracker",
      //   component: WorkOrderTrackerListComponent,
      // },
      {
        title: "Cables Report",
        path: "cables",
        component: CablesComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MasterSchedulingRoutingModule {}
