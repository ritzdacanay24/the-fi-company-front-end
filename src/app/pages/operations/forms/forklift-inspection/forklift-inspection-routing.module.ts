
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { ForkliftInspectionComponent } from './forklift-inspection.component';
import { ForkliftInspectionListComponent } from './forklift-inspection-list/forklift-inspection-list.component';
import { ForkliftInspectionEditComponent } from './forklift-inspection-edit/forklift-inspection-edit.component';
import { ForkliftInspectionCreateComponent } from './forklift-inspection-create/forklift-inspection-create.component';


const routes: Routes = [
  {
    path: '',
    component: ForkliftInspectionComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: ForkliftInspectionListComponent
      },
      {
        path: 'edit',
        component: ForkliftInspectionEditComponent
      },
      {
        path: 'create',
        component: ForkliftInspectionCreateComponent
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
export class ForkliftInspectionRoutingModule { }
