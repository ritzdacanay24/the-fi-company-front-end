import { NonBillableCodeModule } from './non-billable-code/non-billable-code.module';

import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MaintenanceComponent } from './maintenance.component';

const routes: Routes = [
  {
    path: '',
    component: MaintenanceComponent,
    children: [
      {
        path: 'ticket-event',
        loadChildren: () => import('./ticket-event/ticket-event-routing.module').then(m => m.TicketEventRoutingModule),
        data: { preload: true }
      },
      {
        path: 'receipt-category',
        loadChildren: () => import('./receipt-category/receipt-category-routing.module').then(m => m.ReceiptCategoryRoutingModule),
        data: { preload: true }
      },
      {
        path: 'customer',
        loadChildren: () => import('./customer/customer-routing.module').then(m => m.CustomerRoutingModule),
        data: { preload: true }
      },
      {
        path: 'vendor',
        loadChildren: () => import('./vendor/vendor-routing.module').then(m => m.VendorRoutingModule),
        data: { preload: true }
      },
      {
        path: 'job-status',
        loadChildren: () => import('./job-status/job-status-routing.module').then(m => m.JobStatusRoutingModule),
        data: { preload: true }
      },
      {
        path: 'service-type',
        loadChildren: () => import('./service-type/service-type-routing.module').then(m => m.ServiceTypeRoutingModule),
        data: { preload: true }
      },
      {
        path: 'platform',
        loadChildren: () => import('./platform/platform-routing.module').then(m => m.PlatformRoutingModule),
        data: { preload: true }
      },
      {
        path: 'license',
        loadChildren: () => import('./license-entity/license-entity-routing.module').then(m => m.LicenseEntityRoutingModule),
        data: { preload: true }
      },
      {
        path: 'property',
        loadChildren: () => import('./property/property-routing.module').then(m => m.PropertyRoutingModule),
        data: { preload: true }
      },
      {
        path: 'credit-card-transaction',
        loadChildren: () => import('./credit-card-transaction/credit-card-transaction-routing.module').then(m => m.CreditCardTransactionRoutingModule),
        data: { preload: true }
      },
      {
        path: 'non-billable-code',
        loadChildren: () => import('./non-billable-code/non-billable-code-routing.module').then(m => m.NonBillableCodeRoutingModule),
        data: { preload: true }
      },
      {
        path: 'user',
        loadChildren: () => import('./user/user-routing.module').then(m => m.UserRoutingModule),
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
export class MaintenanceRoutingModule { }
