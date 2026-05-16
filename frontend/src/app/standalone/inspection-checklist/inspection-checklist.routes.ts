import { Routes } from '@angular/router';

export const INSPECTION_CHECKLIST_STANDALONE_ROUTES: Routes = [
  {
    path: '',
    title: 'Quality Inspection',
    loadComponent: () =>
      import('../checklist-workflow-hub/checklist-workflow-hub.component').then(
        (c) => c.ChecklistWorkflowHubComponent,
      ),
  },
  {
    path: 'instance',
    redirectTo: '/inspection-checklist/instance',
    pathMatch: 'full',
  },
  {
    path: 'execution',
    title: 'Checklist Execution',
    loadComponent: () =>
      import('../../pages/quality/checklist/execution/checklist-execution.component').then(
        (c) => c.ChecklistExecutionComponent,
      ),
  },
  {
    path: 'management',
    title: 'Start Inspection',
    loadComponent: () =>
      import('../../pages/quality/checklist/checklist.component').then(
        (c) => c.ChecklistComponent,
      ),
  },
  {
    path: 'reports',
    title: 'Checklist Reports',
    loadComponent: () =>
      import('../../pages/quality/checklist/reports/checklist-reports.component').then(
        (c) => c.ChecklistReportsComponent,
      ),
  },
  {
    path: 'dashboard',
    title: 'Inspection Performance Dashboard',
    loadComponent: () =>
      import('../../pages/quality/checklist/reports/checklist-reports.component').then(
        (c) => c.ChecklistReportsComponent,
      ),
  },
  {
    path: 'template-manager',
    title: 'Checklist Template Manager',
    loadComponent: () =>
      import('../../pages/quality/checklist/template-manager/checklist-template-list.component').then(
        (c) => c.ChecklistTemplateListComponent,
      ),
  },
  {
    path: 'template-editor',
    title: 'Checklist Template Editor',
    loadComponent: () =>
      import('../../pages/quality/checklist/template-editor/checklist-template-editor.component').then(
        (c) => c.ChecklistTemplateEditorComponent,
      ),
  },
  {
    path: 'template-editor/:id',
    title: 'Checklist Template Editor',
    loadComponent: () =>
      import('../../pages/quality/checklist/template-editor/checklist-template-editor.component').then(
        (c) => c.ChecklistTemplateEditorComponent,
      ),
  },
  {
    path: 'audit',
    title: 'Checklist Audit',
    loadComponent: () =>
      import('../../pages/quality/checklist/audit/checklist-audit.component').then(
        (c) => c.ChecklistAuditComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
