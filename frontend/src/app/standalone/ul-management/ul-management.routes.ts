import { Routes } from '@angular/router';
import { UlManagementLayoutComponent } from './ul-management-layout.component';

export const UL_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: UlManagementLayoutComponent,
    children: [
      { path: '', redirectTo: 'labels-report', pathMatch: 'full' },
      { path: 'overview', redirectTo: 'labels-report', pathMatch: 'full' },
      {
        path: 'labels-report',
        title: 'UL Labels Report',
        loadComponent: () =>
          import('../../features/ul-management/components/ul-labels-report/ul-labels-report.component').then(
            (c) => c.ULLabelsReportComponent,
          ),
      },
      {
        path: 'upload',
        title: 'Upload UL Labels',
        loadComponent: () =>
          import('../../features/ul-management/components/ul-label-upload/ul-label-upload.component').then(
            (c) => c.ULLabelUploadComponent,
          ),
      },
      {
        path: 'usage-report',
        title: 'UL Usage Report',
        loadComponent: () =>
          import('../../features/ul-management/components/ul-usage-report/ul-usage-report.component').then(
            (c) => c.ULUsageReportComponent,
          ),
      },
      {
        path: 'v2',
        title: 'UL Management v2',
        loadComponent: () =>
          import('../../features/ul-management/pages/ul-management-v2.component').then(
            (c) => c.ULManagementV2Component,
          ),
      },
      {
        path: 'v3',
        title: 'UL Management v3',
        loadComponent: () =>
          import('../../features/ul-management/pages/ul-management-v3.component').then(
            (c) => c.ULManagementV3Component,
          ),
      },
      { path: '**', redirectTo: 'labels-report' },
    ],
  },
];
