
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { ShortagesComponent } from './shortages.component';
import { ShortagesListComponent } from './shortages-list/shortages-list.component';
import { ShortagesEditComponent } from './shortages-edit/shortages-edit.component';
import { ShortagesCreateComponent } from './shortages-create/shortages-create.component';

const routes: Routes = [
  {
    path: '',
    component: ShortagesComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: ShortagesListComponent
      },
      {
        path: 'edit',
        component: ShortagesEditComponent
      },
      {
        path: 'create',
        component: ShortagesCreateComponent
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
export class ShortagesRoutingModule { }
