
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    loadChildren: () => import('./overview/overview-routing.module').then(m => m.OverviewRoutingModule)
  },
  {
    path: 'rma',
    loadChildren: () => import('./rma/rma-routing.module').then(m => m.RmaRoutingModule)
  },
  {
    path: 'sg-asset',
    loadChildren: () => import('./sg-asset/sg-asset-routing.module').then(m => m.SgAssetRoutingModule)
  },
  {
    path: 'ags-serial',
    loadChildren: () => import('./ags-serial/ags-serial-routing.module').then(m => m.AgsSerialRoutingModule)
  },
  {
    path: 'mrb',
    loadChildren: () => import('./mrb/mrb-routing.module').then(m => m.MrbRoutingModule)
  },
  {
    path: 'ncr',
    loadChildren: () => import('./ncr/ncr-routing.module').then(m => m.NcrRoutingModule)
  },
  {
    path: 'qir',
    loadChildren: () => import('./qir/qir-routing.module').then(m => m.QirRoutingModule)
  },
  {
    path: 'mrb',
    loadChildren: () => import('./mrb/mrb-routing.module').then(m => m.MrbRoutingModule)
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    NgbNavModule
  ],
  exports: [RouterModule]
})
export class QualityRoutingModule { }
