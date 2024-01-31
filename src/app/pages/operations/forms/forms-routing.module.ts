import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { FormsComponent } from './forms.component';

const routes: Routes = [
  {
    path: '',
    component: FormsComponent,
    children: [
      {
        path: 'shipping-request',
        loadChildren: () => import('./shipping-request/shipping-request-routing.module').then(m => m.ShippingRequestRoutingModule),
        data: { preload: true }
      },
      {
        path: 'vehicle',
        loadChildren: () => import('./vehicle/vehicle-routing.module').then(m => m.VehicleRoutingModule),
        data: { preload: true }
      },
      {
        path: 'placard',
        loadChildren: () => import('./placard/placard-routing.module').then(m => m.PlacardRoutingModule),
        data: { preload: true }
      },
      {
        path: 'igt-transfer',
        loadChildren: () => import('./igt-transfer/igt-transfer-routing.module').then(m => m.IgtTransferRoutingModule),
        data: { preload: true }
      },
      {
        path: 'rfq',
        loadChildren: () => import('./rfq/rfq-routing.module').then(m => m.RfqRoutingModule),
        data: { preload: true }
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
export class FormsRoutingModule { }
