
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { MaterialRequestComponent } from './material-request.component';
import { MaterialRequestListComponent } from './material-request-list/material-request-list.component';
import { MaterialRequestEditComponent } from './material-request-edit/material-request-edit.component';
import { MaterialRequestCreateComponent } from './material-request-create/material-request-create.component';
import { MaterialRequestPickingComponent } from './material-request-picking/material-request-picking.component';
import { MaterialRequestValidateComponent } from './material-request-validate/material-request-validate.component';
import { MaterialRequestValidateListComponent } from './material-request-validate-list/material-request-validate-list.component';

const routes: Routes = [
  {
    path: '',
    component: MaterialRequestComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: MaterialRequestListComponent
      },
      {
        path: 'edit',
        component: MaterialRequestEditComponent
      },
      {
        path: 'create',
        component: MaterialRequestCreateComponent
      },
      {
        path: 'validate-list',
        component: MaterialRequestValidateListComponent
      },
      {
        path: 'picking',
        component: MaterialRequestPickingComponent
      },
    ]
  },
  {
    path: 'picking',
    component: MaterialRequestPickingComponent
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class MaterialRequestRoutingModule { }
