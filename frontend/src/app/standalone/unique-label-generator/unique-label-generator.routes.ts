import { Routes } from '@angular/router';
import { UniqueLabelGeneratorLayoutComponent } from './unique-label-generator-layout.component';
import { UniqueLabelGeneratorComponent } from './unique-label-generator.component';
import { UniqueLabelHistoryComponent } from './unique-label-history.component';
import { UniqueLabelReportsComponent } from './unique-label-reports.component';
import { UniqueLabelAdminComponent } from './unique-label-admin.component';

export const UNIQUE_LABEL_GENERATOR_ROUTES: Routes = [
  {
    path: '',
    component: UniqueLabelGeneratorLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'create' },
      { path: 'create', component: UniqueLabelGeneratorComponent },
      { path: 'history', component: UniqueLabelHistoryComponent },
      { path: 'reports', component: UniqueLabelReportsComponent },
      { path: 'admin', component: UniqueLabelAdminComponent },
    ],
  },
];
