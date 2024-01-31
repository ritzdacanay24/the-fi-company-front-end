import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layouts/layout.component';

// Auth
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { RequestPublicComponent } from './pages/public/request-public/request-public.component';
import { QirCreatePublicComponent } from './pages/quality/qir/qir-create-public/qir-create-public.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  { path: 'field-service', component: LayoutComponent, loadChildren: () => import('./pages/field-service/field-service-routing.module').then(m => m.FieldServiceRoutingModule), canActivate: [AuthGuard] },
  { path: 'auth', loadChildren: () => import('./account/account.module').then(m => m.AccountModule) },
  { path: 'pages', loadChildren: () => import('./extraspages/extraspages.module').then(m => m.ExtraspagesModule), canActivate: [AuthGuard] },
  { path: 'quality', component: LayoutComponent, loadChildren: () => import('./pages/quality/quality-routing.module').then(m => m.QualityRoutingModule), canActivate: [AuthGuard] },
  { path: 'operations', component: LayoutComponent, loadChildren: () => import('./pages/operations/operations-routing.module').then(m => m.OperationsRoutingModule), canActivate: [AuthGuard] },
  { path: 'maintenance', component: LayoutComponent, loadChildren: () => import('./pages/maintenance/maintenance-routing.module').then(m => m.MaintenanceRoutingModule), canActivate: [AdminGuard] },
  { path: 'admin', component: LayoutComponent, loadChildren: () => import('./pages/admin/admin-routing.module').then(m => m.AdminRoutingModule), canActivate: [AdminGuard] },
  {
    path: 'request',
    component: RequestPublicComponent,
  },
  {
    path: 'quality-incident-request',
    component: QirCreatePublicComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
