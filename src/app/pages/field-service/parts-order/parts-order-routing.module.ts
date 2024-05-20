
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { PartsOrderComponent } from './parts-order.component';
import { PartsOrderListComponent } from './parts-order-list/parts-order-list.component';
import { PartsOrderCreateComponent } from './parts-order-create/parts-order-create.component';
import { PartsOrderEditComponent } from './parts-order-edit/parts-order-edit.component';

const routes: Routes = [
  {
    path: '',
    component: PartsOrderComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: PartsOrderListComponent
      },
      {
        path: 'create',
        component: PartsOrderCreateComponent
      },
      {
        path: 'edit',
        component: PartsOrderEditComponent
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
export class PartsOrderRoutingModule { }
