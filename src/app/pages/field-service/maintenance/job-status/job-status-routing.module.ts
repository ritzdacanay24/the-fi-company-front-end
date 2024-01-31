
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { JobStatusComponent } from './job-status.component';
import { JobStatusListComponent } from './job-status-list/job-status-list.component';
import { JobStatusEditComponent } from './job-status-edit/job-status-edit.component';
import { JobStatusCreateComponent } from './job-status-create/job-status-create.component';

const routes: Routes = [
  {
    path: '',
    component: JobStatusComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: JobStatusListComponent
      },
      {
        path: 'edit',
        component: JobStatusEditComponent
      },
      {
        path: 'create',
        component: JobStatusCreateComponent
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
export class JobStatusRoutingModule { }
