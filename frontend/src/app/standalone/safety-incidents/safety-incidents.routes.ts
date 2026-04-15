import { Routes } from '@angular/router';
import { CanDeactivateGuard } from '@app/core/guards/CanDeactivateGuard';
import { SafetyIncidentsLayoutComponent } from '@app/standalone/safety-incidents/safety-incidents-layout.component';

export const SAFETY_INCIDENTS_ROUTES: Routes = [
  {
    path: '',
    component: SafetyIncidentsLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      {
        path: 'list',
        loadComponent: () =>
          import('../../pages/operations/forms/safety-incident/safety-incident-list/safety-incident-list.component').then(
            (m) => m.SafetyIncidentListComponent,
          ),
      },
      {
        path: 'create',
        canDeactivate: [CanDeactivateGuard],
        loadComponent: () =>
          import('../../pages/operations/forms/safety-incident/safety-incident-create/safety-incident-create.component').then(
            (m) => m.SafetyIncidentCreateComponent,
          ),
      },
      {
        path: 'edit',
        canDeactivate: [CanDeactivateGuard],
        loadComponent: () =>
          import('../../pages/operations/forms/safety-incident/safety-incident-edit/safety-incident-edit.component').then(
            (m) => m.SafetyIncidentEditComponent,
          ),
      },
      {
        path: 'view',
        loadComponent: () =>
          import('../../pages/operations/forms/safety-incident/safety-incident-view/safety-incident-view.component').then(
            (m) => m.SafetyIncidentViewComponent,
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../../pages/operations/forms/safety-incident/safety-dashboard/safety-dashboard.component').then(
            (m) => m.SafetyDashboardComponent,
          ),
      },
      { path: '**', redirectTo: 'list' },
    ],
  },
];
