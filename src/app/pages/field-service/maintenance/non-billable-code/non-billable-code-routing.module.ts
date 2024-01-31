
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NonBillableCodeComponent } from './non-billable-code.component';
import { NonBillableCodeEditComponent } from './non-billable-code-edit/non-billable-code-edit.component';
import { NonBillableCodeCreateComponent } from './non-billable-code-create/non-billable-code-create.component';
import { NonBillableCodeListComponent } from './non-billable-code-list/non-billable-code-list.component';

const routes: Routes = [
  {
    path: '',
    component: NonBillableCodeComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: NonBillableCodeListComponent
      },
      {
        path: 'edit',
        component: NonBillableCodeEditComponent
      },
      {
        path: 'create',
        component: NonBillableCodeCreateComponent
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
export class NonBillableCodeRoutingModule { }
