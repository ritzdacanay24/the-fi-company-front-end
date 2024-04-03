
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { ShippingComponent } from './shipping/shipping.component';
import { MasterSchedulingComponent } from './master-scheduling.component';
import { PickingRoutingComponent } from './picking-routing/picking-routing.component';
import { QcRoutingComponent } from './qc-routing/qc-routing.component';
import { ProductionRoutingComponent } from './production-routing/production-routing.component';
import { AllRoutingComponent } from './all-routing/all-routing.component';
import { KanbanComponent } from './kanban/kanban.component';
import { CablesComponent } from './cables/cables.component';

const routes: Routes = [
  {
    path: '',
    component: MasterSchedulingComponent,
    children: [
      {
        path: '',
        redirectTo: 'shipping',
        pathMatch: 'full'
      },
      {
        path: 'shipping',
        component: ShippingComponent
      },
      {
        path: 'all-routing',
        component: AllRoutingComponent
      },
      {
        path: 'picking-routing',
        component: PickingRoutingComponent
      },
      {
        path: 'production-routing',
        component: ProductionRoutingComponent
      },
      {
        path: 'qc-routing',
        component: QcRoutingComponent
      },
      {
        path: 'kanban',
        component: KanbanComponent
      },
      {
        path: 'cables',
        component: CablesComponent
      },
    ]
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class MasterSchedulingRoutingModule { }
