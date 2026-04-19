import { Routes } from '@angular/router';

export const PROJECT_MANAGER_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../../pages/operations/project-manager/project-manager-dashboard.component').then(
        (m) => m.ProjectManagerDashboardComponent,
      ),
  },
  {
    path: 'new-project',
    loadComponent: () =>
      import('../../pages/operations/project-manager/new-project.component').then((m) => m.NewProjectComponent),
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('../../pages/operations/project-manager/project-manager-tasks.component').then(
        (m) => m.ProjectManagerTasksComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
