import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JobComponent } from './job.component';
import { JobListComponent } from './job-list/job-list.component';
import { JobCreateComponent } from './job-create/job-create.component';
import { JobMapComponent } from './job-map/job-map.component';
import { JobEditComponent } from './job-edit/job-edit.component';
import { JobOverviewPageComponent } from './job-overview-page/job-overview-page.component';
import { JobOpenInvoiceComponent } from './job-open-invoice/job-open-invoice.component';

const routes: Routes = [
  {
    path: '',
    component: JobComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: JobListComponent
      },
      {
        path: 'edit',
        component: JobEditComponent
      },
      {
        path: 'create',
        component: JobCreateComponent
      },
      {
        path: 'job-open-invoice',
        component: JobOpenInvoiceComponent
      },
      {
        path: 'map',
        component: JobMapComponent
      },
    ]
  },
  {
    path: 'overview',
    component: JobOverviewPageComponent
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JobRoutingModule { }
