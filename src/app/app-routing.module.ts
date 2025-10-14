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
import { StandaloneShippingPriorityDisplayComponent } from "./standalone/shipping-priority-display/shipping-priority-display.component";
import { PublicFormsMenuComponent } from "./standalone/public-forms-menu/public-forms-menu.component";
import { SafetyDashboardComponent } from "./pages/operations/forms/safety-incident/safety-dashboard/safety-dashboard.component";

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
  
  // Public Forms Portal
  { 
    path: "forms", 
    component: PublicFormsMenuComponent,
    title: "Public Forms Portal"
  },
  
  // Standalone Forms
  { 
    path: "standalone/ul-usage", 
    component: StandaloneULUsageFormComponent,
    title: "UL Usage Entry"
  },
  { 
    path: "standalone/igt-serial", 
    loadComponent: () => import("./standalone/standalone-igt-form/standalone-igt-form.component").then(c => c.StandaloneIgtFormComponent),
    title: "IGT Serial Generator"
  },
  { 
    path: "standalone/ags-serial", 
    loadComponent: () => import("./standalone/standalone-ags-serial/standalone-ags-serial.component").then(c => c.StandaloneAgsSerialComponent),
    title: "AGS Serial Creation"
  },
  { 
    path: "standalone/sg-asset", 
    loadComponent: () => import("./standalone/standalone-sg-asset/standalone-sg-asset.component").then(c => c.StandaloneSgAssetComponent),
    title: "Light and Wonder Asset Creation"
  },
  { 
    path: "standalone/serial-generator", 
    loadComponent: () => import("./standalone/standalone-serial-generator/standalone-serial-generator.component").then(c => c.StandaloneSerialGeneratorComponent),
    title: "Serial Number Generator"
  },
  
  // Legacy route for backward compatibility
  { 
    path: "ul-usage", 
    redirectTo: "standalone/ul-usage"
  },
  { 
    path: "shipping-priority-display", 
    component: StandaloneShippingPriorityDisplayComponent,
    title: "Shipping Priority Display"
  },
  { 
    path: "safety-dashboard-display", 
    component: SafetyDashboardComponent,
    title: "Safety Dashboard Display"
  },
  { 
    path: "qir-dashboard-display", 
    loadComponent: () => import("./standalone/qir-dashboard-display/qir-dashboard-display.component").then(c => c.QirDashboardDisplayComponent),
    title: "QIR Dashboard Display"
  },
  {
    path: "auth",
    loadChildren: () =>
      import("./account/account.module").then((m) => m.AccountModule),
  },
  // New Field Service App (standalone)
  {
    path: "field-service",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      { path: "", redirectTo: "overview/summary", pathMatch: "full" },
      {
        title: "Field Service",
        path: "",
        loadChildren: () =>
          import("./pages/field-service/field-service-routing.module").then(
            (m) => m.FieldServiceRoutingModule
          ),
      },
    ],
  },
  { path: "", redirectTo: "menu", pathMatch: "full" },
  // Operations routes (moved from dashboard)
  {
    path: "operations",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      {
        title: "Operations",
        path: "",
        loadChildren: () =>
          import("./pages/operations/operations-routing.module").then(
            (m) => m.OperationsRoutingModule
          ),
      },
    ],
  },
  // Quality routes (moved from dashboard)
  {
    path: "quality",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      {
        title: "Quality",
        path: "",
        loadChildren: () =>
          import("./pages/quality/quality-routing.module").then(
            (m) => m.QualityRoutingModule
          ),
      },
    ],
  },
  // Admin routes (moved from dashboard)
  {
    path: "admin",
    component: LayoutComponent,
    canActivate: [AuthGuard, AccessGuard],
    runGuardsAndResolvers: "always",
    children: [
      {
        title: "Admin",
        path: "",
        loadChildren: () =>
          import("./pages/admin/admin-routing.module").then(
            (m) => m.AdminRoutingModule
          ),
      },
    ],
  },
  // Maintenance routes (moved from dashboard)
  {
    path: "maintenance",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      { path: "", redirectTo: "overview", pathMatch: "full" },
      {
        title: "Maintenance",
        path: "",
        loadChildren: () =>
          import("./pages/maintenance/maintenance-routing.module").then(
            (m) => m.MaintenanceRoutingModule
          ),
      },
    ],
  },
  // Inspection Checklist routes
  {
    path: "inspection",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      {
        title: "Inspection Checklist",
        path: "",
        loadChildren: () =>
          import("./features/inspection-checklist/inspection-checklist.module").then(
            (m) => m.InspectionChecklistModule
          ),
      },
    ],
  },
  // UL Management routes (moved from dashboard)
  {
    path: "ul-management",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      { path: "", redirectTo: "overview", pathMatch: "full" },
      {
        title: "UL Management",
        path: "",
        loadChildren: () =>
          import("./features/ul-management/ul-management.module").then(
            (m) => m.ULManagementModule
          ),
      },
    ],
  },
  // EyeFi Serial Number Management routes
  {
    path: "eyefi-serial-number-management",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      { path: "", redirectTo: "list", pathMatch: "full" },
      {
        title: "EyeFi Serial Number Management",
        path: "",
        loadChildren: () =>
          import("./features/serial-number-management/serial-number-management-routing.module").then(
            (m) => m.SerialNumberManagementRoutingModule
          ),
      },
    ],
  },
  // Training Management routes
  {
    path: "training",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    children: [
      { path: "", redirectTo: "sessions", pathMatch: "full" },
      {
        title: "Training Management",
        path: "",
        loadChildren: () =>
          import("./pages/training/training-routing.module").then(
            (m) => m.TrainingRoutingModule
          ),
      },
    ],
  },
  // Utility routes
  {
    path: "access-denied",
    component: AccessDeniedComponent,
  },
  {
    path: "in-active",
    component: InActiveComponent,
  },
  // Legacy dashboard route - redirect to menu or remove entirely
  {
    path: "dashboard",
    redirectTo: "menu",
    pathMatch: "full"
  },
  { path: "**", redirectTo: "menu", pathMatch: "full" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    provideRouter(routes, withPreloading(FlagBasedPreloadingStrategy)),
  ],
})
export class AppRoutingModule {}
