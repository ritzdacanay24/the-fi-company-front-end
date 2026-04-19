import { Routes } from '@angular/router';
import { SerialManagementLayoutComponent } from './serial-management-layout.component';

// These routes are loaded as children of LayoutComponent (main app shell) in app-routing.module.ts.
// The SerialManagementLayoutComponent is preserved below at __standalone for reference only.
export const SERIAL_MANAGEMENT_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    title: 'Serial Management Dashboard',
    loadComponent: () =>
      import('./serial-management-dashboard.component').then(
        (c) => c.SerialManagementDashboardComponent,
      ),
  },

  // ── UL Management ─────────────────────────────────────────────
  {
    path: 'ul-labels',
    title: 'UL Labels Inventory',
    loadComponent: () =>
      import('../../features/ul-management/components/ul-labels-report/ul-labels-report.component').then(
        (c) => c.ULLabelsReportComponent,
      ),
  },
  {
    path: 'ul-usage',
    title: 'UL Usage Report',
    loadComponent: () =>
      import('../../features/ul-management/components/ul-usage-report/ul-usage-report.component').then(
        (c) => c.ULUsageReportComponent,
      ),
  },
  {
    path: 'ul-audit-signoff',
    title: 'UL Audit Sign-Off',
    loadComponent: () =>
      import('../../features/ul-management/components/ul-audit-signoff/ul-audit-signoff.component').then(
        (c) => c.UlAuditSignoffComponent,
      ),
  },
  {
    path: 'ul-audit-history',
    title: 'UL Audit History',
    loadComponent: () =>
      import('../../features/ul-management/components/ul-audit-signoff/ul-audit-history.component').then(
        (c) => c.UlAuditHistoryComponent,
      ),
  },
  {
    path: 'ul-upload',
    title: 'Upload UL Labels',
    loadComponent: () =>
      import('../../features/ul-management/components/ul-label-upload/ul-label-upload.component').then(
        (c) => c.ULLabelUploadComponent,
      ),
  },

  // ── IGT ───────────────────────────────────────────────────────
  {
    path: 'igt-inventory',
    title: 'IGT Inventory',
    loadComponent: () =>
      import('../../pages/quality/igt/igt-manage-existing/igt-manage-existing.component').then(
        (c) => c.IgtManageExistingComponent,
      ),
  },
  {
    path: 'igt-usage',
    title: 'IGT Usage Report',
    loadComponent: () =>
      import('../igt-management/igt-usage-report.component').then(
        (c) => c.IgtUsageReportComponent,
      ),
  },
  {
    path: 'igt-upload',
    title: 'Upload IGT Serials',
    loadComponent: () =>
      import('../../pages/quality/igt/serial-number-upload/serial-number-upload.component').then(
        (c) => c.SerialNumberUploadComponent,
      ),
  },

  // ── AGS / SG / EyeFi / Assignments ─────────────────────────
  {
    path: 'ags-serial',
    title: 'AGS Serial Control',
    loadChildren: () =>
      import('../../pages/quality/ags-serial/ags-serial-routing.module').then(
        (m) => m.AgsSerialRoutingModule,
      ),
  },
  {
    path: 'sg-asset',
    title: 'SG Asset Control',
    loadChildren: () =>
      import('../../pages/quality/sg-asset/sg-asset-routing.module').then(
        (m) => m.SgAssetRoutingModule,
      ),
  },
  {
    path: 'eyefi-serials',
    title: 'EyeFi Serials',
    loadChildren: () =>
      import('../../features/serial-number-management/serial-number-management-routing.module').then(
        (m) => m.SerialNumberManagementRoutingModule,
      ),
  },
  {
    path: 'serial-assignments',
    title: 'Serial Assignments',
    loadComponent: () =>
      import('../../features/serial-assignments/serial-assignments.component').then(
        (c) => c.SerialAssignmentsComponent,
      ),
  },

  // ── Unique Label Generator ────────────────────────────────
  {
    path: 'ul-generator',
    children: [
      { path: '', redirectTo: 'create', pathMatch: 'full' },
      {
        path: 'create',
        title: 'Generate Labels',
        loadComponent: () =>
          import('../../standalone/unique-label-generator/unique-label-generator.component').then(
            (c) => c.UniqueLabelGeneratorComponent,
          ),
      },
      {
        path: 'history',
        title: 'UL History',
        loadComponent: () =>
          import('../../standalone/unique-label-generator/unique-label-history.component').then(
            (c) => c.UniqueLabelHistoryComponent,
          ),
      },
      {
        path: 'reports',
        title: 'UL Reports',
        loadComponent: () =>
          import('../../standalone/unique-label-generator/unique-label-reports.component').then(
            (c) => c.UniqueLabelReportsComponent,
          ),
      },
      {
        path: 'admin',
        title: 'UL Admin',
        loadComponent: () =>
          import('../../standalone/unique-label-generator/unique-label-admin.component').then(
            (c) => c.UniqueLabelAdminComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];

