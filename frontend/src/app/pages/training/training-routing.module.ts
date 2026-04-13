import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'live',
        loadComponent: () => import('./live-sessions/live-sessions.component').then(m => m.LiveSessionsComponent),
        title: 'Training Sessions'
      },
      {
        path: 'setup',
        loadComponent: () => import('./training-setup/training-setup.component').then(m => m.TrainingSetupComponent),
        title: 'Manage Training Sessions'
      },
      {
        path: 'setup/:id',
        loadComponent: () => import('./training-setup/training-setup.component').then(m => m.TrainingSetupComponent),
        title: 'Edit Training Session'
      },
      {
        path: 'manage',
        loadComponent: () => import('./training-sessions-list/training-sessions-list.component').then(m => m.TrainingSessionsListComponent),
        title: 'Manage Training Sessions'
      },
      {
        path: 'sign-off/:sessionId',
        loadComponent: () => import('./badge-sign-off/badge-sign-off.component').then(m => m.BadgeSignOffComponent),
        title: 'Badge Sign-Off'
      },
      {
        path: 'attendance/:sessionId',
        loadComponent: () => import('./attendance-dashboard/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent),
        title: 'Training Attendance'
      },
      {
        path: 'templates',
        loadComponent: () => import('./training-templates/template-list/template-list.component').then(m => m.TemplateListComponent),
        title: 'Training Templates'
      },
      {
        path: 'templates/create',
        loadComponent: () => import('./training-templates/template-form/template-form.component').then(m => m.TemplateFormComponent),
        title: 'Create Training Template'
      },
      {
        path: 'templates/edit/:id',
        loadComponent: () => import('./training-templates/template-form/template-form.component').then(m => m.TemplateFormComponent),
        title: 'Edit Training Template'
      },
      {
        path: '',
        redirectTo: 'live',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrainingRoutingModule { }