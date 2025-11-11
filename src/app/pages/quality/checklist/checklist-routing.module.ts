import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

const routes: Routes = [
  {
    path: "",
    loadComponent: () => import('./checklist.component').then(c => c.ChecklistComponent),
  },
  {
    path: "instance",
    loadComponent: () => import('./instance/checklist-instance.component').then(c => c.ChecklistInstanceComponent),
  },
  {
    path: "audit",
    loadComponent: () => import('./audit/checklist-audit.component').then(c => c.ChecklistAuditComponent),
  },
  {
    path: "template-manager",
    loadComponent: () => import('./template-manager/checklist-template-manager.component').then(c => c.ChecklistTemplateManagerComponent),
  },
  {
    path: "template-editor",
    loadComponent: () => import('./template-editor/checklist-template-editor.component').then(c => c.ChecklistTemplateEditorComponent),
  },
  {
    path: "template-editor/:id",
    loadComponent: () => import('./template-editor/checklist-template-editor.component').then(c => c.ChecklistTemplateEditorComponent),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChecklistRoutingModule { }
