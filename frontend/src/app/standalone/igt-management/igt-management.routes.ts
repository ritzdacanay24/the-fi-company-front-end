import { Routes } from '@angular/router';
import { IgtManagementLayoutComponent } from './igt-management-layout.component';

export const IGT_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: IgtManagementLayoutComponent,
    children: [
      { path: '', redirectTo: 'inventory', pathMatch: 'full' },
      {
        path: 'inventory',
        title: 'IGT Serial Inventory',
        loadComponent: () =>
          import('../../pages/quality/igt/igt-manage-existing/igt-manage-existing.component').then(
            (c) => c.IgtManageExistingComponent,
          ),
      },
      {
        path: 'upload',
        title: 'Upload IGT Serials',
        loadComponent: () =>
          import('../../pages/quality/igt/serial-number-upload/serial-number-upload.component').then(
            (c) => c.SerialNumberUploadComponent,
          ),
      },
    ],
  },
];
