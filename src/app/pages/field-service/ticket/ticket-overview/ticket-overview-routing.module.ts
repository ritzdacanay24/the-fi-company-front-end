
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { TicketOverviewComponent } from './ticket-overview.component';
import { SerialComponent } from './serial/serial.component';
import { ErrorPageComponent } from '@app/views/pages/error-page/error-page.component';
import { ReceiptComponent } from './receipts/receipt.component';
import { AttachmentComponent } from './attachment/attachment.component';
import { CrashKitComponent } from './crash-kit/crash-kit.component';
import { QirComponent } from './qir/qir.component';
import { EventComponent } from './event/event.component';
import { WorkOrderSummaryComponent } from './work-order-summary/work-order-summary.component';
import { WorkOrderComponent } from './work-order/work-order.component';

const routes: Routes = [
  {
    path: '',
    component: TicketOverviewComponent,
    children: [
      {
        path: '',
        redirectTo: 'event',
        pathMatch: 'full'
      },
      {
        path: 'serial',
        component: SerialComponent
      },
      {
        path: 'receipts',
        component: ReceiptComponent
      },
      {
        path: 'attachment',
        component: AttachmentComponent
      },
      {
        path: 'crash-kit',
        component: CrashKitComponent
      },
      {
        path: 'qir',
        component: QirComponent
      },
      {
        path: 'event',
        component: EventComponent
      },
      {
        path: 'summary',
        component: WorkOrderComponent
      },
      {
        path: 'error',
        component: ErrorPageComponent,
        data: {
          'type': 404,
          'title': 'Page Not Found',
          'desc': 'Oopps!! The page you were looking for doesn\'t exist.'
        }
      },
      {
        path: '**', redirectTo: 'error', pathMatch: 'full'
      }
    ]
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class TicketOverviewRoutingModule { }
