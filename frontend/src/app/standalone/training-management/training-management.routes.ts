import { Routes } from '@angular/router';

export const TRAINING_MANAGEMENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'live' },
  {
    path: 'live',
    loadComponent: () => import('../../pages/training/live-sessions/live-sessions.component').then((m) => m.LiveSessionsComponent),
  },
  {
    path: 'setup',
    loadComponent: () => import('../../pages/training/training-setup/training-setup.component').then((m) => m.TrainingSetupComponent),
  },
  {
    path: 'setup/:id',
    loadComponent: () => import('../../pages/training/training-setup/training-setup.component').then((m) => m.TrainingSetupComponent),
  },
  {
    path: 'manage',
    loadComponent: () =>
      import('../../pages/training/training-sessions-list/training-sessions-list.component').then(
        (m) => m.TrainingSessionsListComponent,
      ),
  },
  {
    path: 'sign-off/:sessionId',
    loadComponent: () => import('../../pages/training/badge-sign-off/badge-sign-off.component').then((m) => m.BadgeSignOffComponent),
  },
  {
    path: 'attendance/:sessionId',
    loadComponent: () =>
      import('../../pages/training/attendance-dashboard/attendance-dashboard.component').then(
        (m) => m.AttendanceDashboardComponent,
      ),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('../../pages/training/training-templates/template-list/template-list.component').then(
        (m) => m.TemplateListComponent,
      ),
  },
  {
    path: 'templates/create',
    loadComponent: () =>
      import('../../pages/training/training-templates/template-form/template-form.component').then(
        (m) => m.TemplateFormComponent,
      ),
  },
  {
    path: 'templates/edit/:id',
    loadComponent: () =>
      import('../../pages/training/training-templates/template-form/template-form.component').then(
        (m) => m.TemplateFormComponent,
      ),
  },
  {
    path: 'reports',
    loadComponent: () => import('./training-reports.component').then((m) => m.TrainingReportsComponent),
  },
  { path: '**', redirectTo: 'live' },
];
