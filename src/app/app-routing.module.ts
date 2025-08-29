import { NgModule } from "@angular/core";
import {
  RouterModule,
  Routes,
  provideRouter,
  withPreloading,
} from "@angular/router";

import { LayoutComponent } from "./layouts/layout.component";

// Auth
import { AuthGuard } from "./core/guards/auth.guard";
import { RequestPublicComponent } from "./pages/public/request-public/request-public.component";
import { QirCreatePublicComponent } from "./pages/quality/qir/qir-create-public/qir-create-public.component";
import { StandaloneULUsageFormComponent } from "./standalone/ul-usage-form/ul-usage-form.component";

import { FlagBasedPreloadingStrategy } from "./shared/providers/preload";
import { MenuComponent } from "./pages/menu/menu.component";
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { AccessDeniedComponent } from "./pages/access-denied/access-denied.component";
import { AccessGuard } from "./core/guards/access.guard";
import { InActiveComponent } from "./pages/in-active/in-active.component";
import { BomViewComponent } from "@app/pages/operations/bom/bom-view/bom-view.component";

const routes: Routes = [
  {
    path: "product-structure-inquiry",
    component: BomViewComponent,
  },
  { path: "menu", component: MenuComponent },
  { path: "request", component: RequestPublicComponent },
  { path: "quality-incident-request", component: QirCreatePublicComponent },
  { 
    path: "ul-usage", 
    component: StandaloneULUsageFormComponent,
    title: "UL Usage Entry"
  },
  {
    path: "auth",
    loadChildren: () =>
      import("./account/account.module").then((m) => m.AccountModule),
  },
  { path: "", redirectTo: "menu", pathMatch: "full" },
  {
    path: "dashboard",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      { path: "dashboard", component: DashboardComponent },
      {
        title: "Field Service",
        path: "field-service",
        loadChildren: () =>
          import("./pages/field-service/field-service-routing.module").then(
            (m) => m.FieldServiceRoutingModule
          ),
      },
      {
        title: "Quality",
        path: "quality",
        loadChildren: () =>
          import("./pages/quality/quality-routing.module").then(
            (m) => m.QualityRoutingModule
          ),
      },
      {
        title: "Operations",
        path: "operations",
        loadChildren: () =>
          import("./pages/operations/operations-routing.module").then(
            (m) => m.OperationsRoutingModule
          ),
      },
      {
        title: "Maintenance",
        path: "maintenance",
        loadChildren: () =>
          import("./pages/maintenance/maintenance-routing.module").then(
            (m) => m.MaintenanceRoutingModule
          ),
        runGuardsAndResolvers: "always",
      },
      {
        title: "UL Management",
        path: "ul-management",
        loadChildren: () =>
          import("./features/ul-management/ul-management.module").then(
            (m) => m.ULManagementModule
          ),
      },
      {
        title: "Admin",
        path: "admin",
        loadChildren: () =>
          import("./pages/admin/admin-routing.module").then(
            (m) => m.AdminRoutingModule
          ),
        canActivate: [AccessGuard],
        runGuardsAndResolvers: "always",
      },
      {
        path: "access-denied",
        component: AccessDeniedComponent,
      },
      {
        path: "in-active",
        component: InActiveComponent,
      },
    ],
  },
  { path: "**", redirectTo: "dashboard", pathMatch: "full" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    provideRouter(routes, withPreloading(FlagBasedPreloadingStrategy)),
  ],
})
export class AppRoutingModule {}
