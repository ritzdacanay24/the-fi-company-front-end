import { Routes } from '@angular/router';
import { ProjectManagerLayoutComponent } from './project-manager-layout.component';

export const PROJECT_MANAGER_ROUTES: Routes = [
  {
    path: '',
    component: ProjectManagerLayoutComponent,
    children: [
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
    ],
  },
];
