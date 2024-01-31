
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { ShippingComponent } from './shipping/shipping.component';
import { MasterSchedulingComponent } from './master-scheduling.component';
import { MasterProductionComponent } from './master-production/master-production.component';

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
        path: 'master-production',
        component: MasterProductionComponent
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
