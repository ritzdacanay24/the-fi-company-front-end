
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { IgtTransferComponent } from './igt-transfer.component';
import { IgtTransferListComponent } from './igt-transfer-list/igt-transfer-list.component';
import { IgtTransferCreateComponent } from './igt-transfer-create/igt-transfer-create.component';
import { IgtTransferEditComponent } from './igt-transfer-edit/igt-transfer-edit.component';

const routes: Routes = [
  {
    path: '',
    component: IgtTransferComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: IgtTransferListComponent
      },
      {
        path: 'edit',
        component: IgtTransferEditComponent
      },
      {
        path: 'create',
        component: IgtTransferCreateComponent
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
export class IgtTransferRoutingModule { }
