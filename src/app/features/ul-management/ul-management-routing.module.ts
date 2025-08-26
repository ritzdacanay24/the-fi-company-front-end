import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import components
import { ULManagementComponent } from './pages/ul-management.component';
import { ULLabelUploadComponent } from './components/ul-label-upload/ul-label-upload.component';
import { ULLabelsReportComponent } from './components/ul-labels-report/ul-labels-report.component';
import { ULLabelUsageComponent } from './components/ul-label-usage/ul-label-usage.component';

const routes: Routes = [
  {
    path: '',
    component: ULManagementComponent,
    data: { title: 'UL Management Dashboard' }
  },
  {
    path: 'upload',
    component: ULLabelUploadComponent,
    data: { title: 'Upload UL Labels' }
  },
  {
    path: 'labels-report',
    component: ULLabelsReportComponent,
    data: { title: 'UL Labels Report' }
  },
  {
    path: 'usage',
    component: ULLabelUsageComponent,
    data: { title: 'Record UL Label Usage' }
  },
  {
    path: 'usage/:ulNumber',
    component: ULLabelUsageComponent,
    data: { title: 'Record UL Label Usage' }
  },
  {
    path: 'usage-report',
    loadComponent: () => import('./components/ul-usage-report/ul-usage-report.component').then(c => c.ULUsageReportComponent),
    data: { title: 'UL Usage Report' }
  },
  {
    path: 'v2',
    loadComponent: () => import('./pages/ul-management-v2.component').then(c => c.ULManagementV2Component),
    data: { title: 'UL Management v2' }
  },
  {
    path: 'v3',
    loadComponent: () => import('./pages/ul-management-v3.component').then(c => c.ULManagementV3Component),
    data: { title: 'UL Management v3' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ULManagementRoutingModule { }
