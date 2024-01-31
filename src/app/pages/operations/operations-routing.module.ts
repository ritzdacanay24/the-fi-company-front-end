
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { OverviewComponent } from './overview/overview.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    component: OverviewComponent
  },
  {
    path: 'reports',
    loadChildren: () => import('./reports/reports-routing.module').then(m => m.ReportsRoutingModule)
  },
  {
    path: 'forms',
    loadChildren: () => import('./forms/forms-routing.module').then(m => m.FormsRoutingModule)
  },
  {
    path: 'maintenance',
    loadChildren: () => import('./maintenance/maintenance-routing.module').then(m => m.MaintenanceRoutingModule)
  },
  {
    path: 'shortages',
    loadChildren: () => import('./shortages/shortages-routing.module').then(m => m.ShortagesRoutingModule)
  },
  {
    path: 'material-request',
    loadChildren: () => import('./material-request/material-request-routing.module').then(m => m.MaterialRequestRoutingModule)
  },
  {
    path: 'logistics',
    loadChildren: () => import('./logistics/logistics-routing.module').then(m => m.LogisticsRoutingModule)
  },
  {
    path: 'graphics',
    loadChildren: () => import('./graphics/graphics-routing.module').then(m => m.GraphicsRoutingModule)
  },
  {
    path: 'physical-inventory',
    loadChildren: () => import('./physical-inventory/physical-inventory-routing.module').then(m => m.PhysicalInventoryRoutingModule)
  },
  {
    path: 'master-scheduling',
    loadChildren: () => import('./master-scheduling/master-scheduling-routing.module').then(m => m.MasterSchedulingRoutingModule)
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class OperationsRoutingModule { }
