
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { VehicleListComponent } from './vehicle-list/vehicle-list.component';
import { VehicleComponent } from './vehicle.component';
import { VehicleEditComponent } from './vehicle-edit/vehicle-edit.component';
import { VehicleCreateComponent } from './vehicle-create/vehicle-create.component';

const routes: Routes = [
  {
    path: '',
    component: VehicleComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: VehicleListComponent
      },
      {
        path: 'edit',
        component: VehicleEditComponent
      },
      {
        path: 'create',
        component: VehicleCreateComponent
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
export class VehicleRoutingModule { }
