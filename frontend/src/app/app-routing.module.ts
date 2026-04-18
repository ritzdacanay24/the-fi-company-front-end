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
import { RequestPublicV2Component } from "./pages/public/request-public-v2/request-public-v2.component";
import { RequestPublicV2HorizontalComponent } from "./pages/public/request-public-v2/request-public-v2-horizontal.component";
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
  { path: "request-v2", component: RequestPublicV2HorizontalComponent },
  { path: "request-v2-horizontal", component: RequestPublicV2HorizontalComponent },
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
    path: "checklist-app",
    loadComponent: () => import("./standalone/checklist-app-install/checklist-app-install.component").then(c => c.ChecklistAppInstallComponent),
    title: "Install Quality Inspection App"
  },
  {
    path: 'quality-checklist',
    redirectTo: 'inspection-checklist',
    pathMatch: 'full'
  },
  {
    path: 'standalone/quality-checklist',
    redirectTo: 'inspection-checklist',
    pathMatch: 'full'
  },
  {
    path: 'inspection-checklist/instance',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/quality/checklist/instance/checklist-instance.component').then(c => c.ChecklistInstanceComponent),
    title: 'Checklist Inspection'
  },
  {
    path: 'inspection-checklist',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./standalone/inspection-checklist/inspection-checklist.routes').then(
        (m) => m.INSPECTION_CHECKLIST_STANDALONE_ROUTES,
      ),
  },
  { 
    path: "standalone/org-chart",
    loadComponent: () => import("./standalone/standalone-org-chart/standalone-org-chart.component").then(m => m.StandaloneOrgChartComponent),
    title: "Organization Chart - Shared View"
  },
  { 
    path: "standalone/eyefi-workflow", 
    loadComponent: () => import("./standalone/eyefi-serial-workflow/eyefi-serial-workflow.component").then(c => c.EyefiSerialWorkflowComponent),
    title: "EyeFi Serial Workflow"
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
  {
    path: "standalone/unique-label-generator",
    loadChildren: () =>
      import("./standalone/unique-label-generator/unique-label-generator.routes").then(
        (m) => m.UNIQUE_LABEL_GENERATOR_ROUTES,
      ),
    title: "Unique Label Generator",
  },
  {
    path: "project-manager",
    canActivate: [AuthGuard],
    loadChildren: () =>
      import("./standalone/project-manager/project-manager.routes").then(
        (m) => m.PROJECT_MANAGER_ROUTES,
      ),
    title: "Project Manager",
  },
  {
    path: "training-management",
    canActivate: [AuthGuard],
    loadChildren: () =>
      import("./standalone/training-management/training-management.routes").then(
        (m) => m.TRAINING_MANAGEMENT_ROUTES,
      ),
    title: "Training Management",
  },
  {
    path: "standalone/ul-management",
    redirectTo: "ul-management",
    pathMatch: "full",
  },
  {
    path: "standalone/training-management",
    redirectTo: "training-management",
    pathMatch: "full",
  },
  { 
    path: "standalone/ul-audit-signoff", 
    redirectTo: "ul-management/audit-signoff",
    pathMatch: "full"
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
    path: "physical-inventory-display", 
    loadComponent: () => import("./standalone/physical-inventory-display/physical-inventory-display.component").then(c => c.PhysicalInventoryDisplayComponent),
    title: "Physical Inventory Display"
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
    path: "standalone/mr-alarm",
    loadComponent: () => import("./components/mr-alarm/mr-alarm-page.component").then(m => m.MrAlarmPageComponent),
    title: "MR Alarm Monitor"
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
  // UL Management routes
  {
    path: "ul-management",
    canActivate: [AuthGuard],
    loadChildren: () =>
      import("./standalone/ul-management/ul-management.routes").then(
        (m) => m.UL_MANAGEMENT_ROUTES,
      ),
    title: "UL Management",
  },
  // IGT Management routes
  {
    path: "igt-management",
    canActivate: [AuthGuard],
    loadChildren: () =>
      import("./standalone/igt-management/igt-management.routes").then(
        (m) => m.IGT_MANAGEMENT_ROUTES,
      ),
    title: "IGT Management",
  },
  // Serial Numbers unified hub
  {
    path: "serial-management",
    canActivate: [AuthGuard],
    loadChildren: () =>
      import("./standalone/serial-management/serial-management.routes").then(
        (m) => m.SERIAL_MANAGEMENT_ROUTES,
      ),
    title: "Serial Numbers",
  },
  // EyeFi Serial Number Management routes
  {
    path: "eyefi-serial-number-management",
    redirectTo: "/serial-management/eyefi-serials",
    pathMatch: "prefix",
  },
  // Serial Assignments Management
  {
    path: "serial-assignments",
    redirectTo: "/serial-management/serial-assignments",
    pathMatch: "prefix",
  },
  // Training Management routes
  {
    path: "training",
    canActivate: [AuthGuard],
    loadChildren: () =>
      import("./standalone/training-management/training-management.routes").then(
        (m) => m.TRAINING_MANAGEMENT_ROUTES,
      ),
    title: "Training Management",
  },
  {
    path: "safety-incidents",
    redirectTo: "operations/forms/safety-incident/list",
    pathMatch: "full",
  },
  {
    path: "safety-incidents/:child",
    redirectTo: "operations/forms/safety-incident/:child",
    pathMatch: "full",
  },
  // Public: Shareable inspection report (no auth)
  {
    path: 'inspection/report/:token',
    loadComponent: () => import('./pages/public/inspection-report/inspection-report.component').then(c => c.InspectionReportComponent),
    title: 'Inspection Report'
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
