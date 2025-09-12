import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { AccessGuard } from "@app/core/guards/access.guard";
import { QuailtyControlPhotosComponent } from "./quailty-control-photos/quailty-control-photos.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "overview",
    pathMatch: "full",
  },
  {
    path: "checklist",
    loadComponent: () => import('./checklist/checklist.component').then(c => c.ChecklistComponent),
  },
  {
    path: "checklist-instance",
    loadComponent: () => import('./checklist-instance/checklist-instance.component').then(c => c.ChecklistInstanceComponent),
  },
  {
    path: "checklist-audit",
    loadComponent: () => import('./checklist-audit/checklist-audit.component').then(c => c.ChecklistAuditComponent),
  },
  {
    path: "quality-control-photos",
    component: QuailtyControlPhotosComponent,
  },
  {
    path: "template-manager",
    loadComponent: () => import('./checklist-template-manager/checklist-template-manager.component').then(c => c.ChecklistTemplateManagerComponent),
  },
  {
    path: "template-editor",
    loadComponent: () => import('./checklist-template-editor/checklist-template-editor.component').then(c => c.ChecklistTemplateEditorComponent),
  },
  {
    path: "template-editor/:id",
    loadComponent: () => import('./checklist-template-editor/checklist-template-editor.component').then(c => c.ChecklistTemplateEditorComponent),
  },
  {
    path: "version-control",
    loadComponent: () => import('./quality-version-control/quality-version-control.component').then(c => c.QualityVersionControlComponent),
  },
  {
    path: "overview",
    loadChildren: () =>
      import("./overview/overview-routing.module").then(
        (m) => m.OverviewRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "rma",
    loadChildren: () =>
      import("./rma/rma-routing.module").then((m) => m.RmaRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "sg-asset",
    loadChildren: () =>
      import("./sg-asset/sg-asset-routing.module").then(
        (m) => m.SgAssetRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "ags-serial",
    loadChildren: () =>
      import("./ags-serial/ags-serial-routing.module").then(
        (m) => m.AgsSerialRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "igt",
    loadChildren: () =>
      import("./igt/igt-routing.module").then(
        (m) => m.IgtRoutingModule
      ),
    runGuardsAndResolvers: "always",
  },
  {
    path: "mrb",
    loadChildren: () =>
      import("./mrb/mrb-routing.module").then((m) => m.MrbRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "car",
    loadChildren: () =>
      import("./ncr/ncr-routing.module").then((m) => m.NcrRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "qir",
    loadChildren: () =>
      import("./qir/qir-routing.module").then((m) => m.QirRoutingModule),
    runGuardsAndResolvers: "always",
  },
  {
    path: "mrb",
    loadChildren: () =>
      import("./mrb/mrb-routing.module").then((m) => m.MrbRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    title: "Serial Number Generator",
    path: "serial-number-generator",
    loadComponent: () =>
      import("../tools/serial-number-demo/serial-number-demo.component").then(
        (m) => m.SerialNumberDemoComponent
      ),
    runGuardsAndResolvers: "always",
  },
  {
    title: "Serial Number Report",
    path: "serial-number-report",
    loadComponent: () =>
      import("../tools/serial-number-report/serial-number-report.component").then(
        (m) => m.SerialNumberReportComponent
      ),
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), NgbNavModule],
  exports: [RouterModule],
})
export class QualityRoutingModule { }
