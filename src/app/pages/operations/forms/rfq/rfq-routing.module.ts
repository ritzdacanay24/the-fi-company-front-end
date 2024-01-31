
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { RfqComponent } from './rfq.component';
import { RfqListComponent } from './rfq-list/rfq-list.component';
import { RfqCreateComponent } from './rfq-create/rfq-create.component';
// import { PlacardCreateComponent } from './placard-create/placard-create.component';
// import { PlacardEditComponent } from './placard-edit/placard-edit.component';

const routes: Routes = [
  {
    path: '',
    component: RfqComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: RfqListComponent
      },
      // {
      //   path: 'edit',
      //   component: PlacardEditComponent
      // },
      {
        path: 'create',
        component: RfqCreateComponent
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
export class RfqRoutingModule { }
