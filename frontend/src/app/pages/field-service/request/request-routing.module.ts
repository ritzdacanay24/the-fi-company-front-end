
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { RequestComponent } from './request.component';
import { RequestsListComponent } from './request-list/request-list.component';
import { RequestEditComponent } from './request-edit/request-edit.component';
import { RequestCreateComponent } from './request-create/request-create.component';

const routes: Routes = [
  {
    path: '',
    component: RequestComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: RequestsListComponent
      },
      {
        path: 'edit',
        component: RequestEditComponent
      },
      {
        path: 'create',
        component: RequestCreateComponent
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
export class RequestRoutingModule { }
