
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { TicketComponent } from './ticket.component';
import { TicketListComponent } from './ticket-list/ticket-list.component';
import { TicketOverviewPageComponent } from './ticket-overview-page/ticket-overview-page.component';

const routes: Routes = [
  {
    path: '',
    component: TicketComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: TicketListComponent
      }
    ]
  },
  {
    path: 'overview',
    component: TicketOverviewPageComponent
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class TicketRoutingModule { }
