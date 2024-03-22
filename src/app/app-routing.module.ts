import { NgModule } from '@angular/core';
import { RouterModule, Routes, provideRouter, withPreloading } from '@angular/router';

import { LayoutComponent } from './layouts/layout.component';

// Auth
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { RequestPublicComponent } from './pages/public/request-public/request-public.component';
import { QirCreatePublicComponent } from './pages/quality/qir/qir-create-public/qir-create-public.component';

import { FlagBasedPreloadingStrategy } from './shared/providers/preload';
import { MenuComponent } from './pages/menu/menu.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

const routes: Routes = [
  { path: 'menu', component: MenuComponent },
  { path: 'request', component: RequestPublicComponent, },
  { path: 'quality-incident-request', component: QirCreatePublicComponent },
  { path: 'auth', loadChildren: () => import('./account/account.module').then(m => m.AccountModule) },
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'field-service', loadChildren: () => import('./pages/field-service/field-service-routing.module').then(m => m.FieldServiceRoutingModule), canActivate: [AuthGuard] },
      { path: 'quality', loadChildren: () => import('./pages/quality/quality-routing.module').then(m => m.QualityRoutingModule), canActivate: [AuthGuard] },
      { path: 'operations', loadChildren: () => import('./pages/operations/operations-routing.module').then(m => m.OperationsRoutingModule), canActivate: [AuthGuard] },
      { path: 'maintenance', loadChildren: () => import('./pages/maintenance/maintenance-routing.module').then(m => m.MaintenanceRoutingModule), canActivate: [AdminGuard] },
      { path: 'admin', loadChildren: () => import('./pages/admin/admin-routing.module').then(m => m.AdminRoutingModule), canActivate: [AdminGuard] },
      { path: '**', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'dashboard', pathMatch: 'full' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    provideRouter(routes, withPreloading(FlagBasedPreloadingStrategy)),
  ]
})
export class AppRoutingModule { }
