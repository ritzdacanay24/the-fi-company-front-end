import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InspectionDashboardComponent } from './components/inspection-dashboard/inspection-dashboard.component';
import { ChecklistTemplateManagerComponent } from './checklist-template-manager/checklist-template-manager.component';
import { ChecklistInstanceComponent } from './components/checklist-instance/checklist-instance.component';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  {
    path: 'dashboard',
    component: InspectionDashboardComponent,
    title: 'Inspection Dashboard'
  },
  {
    path: 'templates',
    component: ChecklistTemplateManagerComponent,
    title: 'Template Manager'
  },
  {
    path: 'instance/:id',
    component: ChecklistInstanceComponent,
    title: 'Checklist Instance'
  },
  {
    path: 'instance/new/:templateId',
    component: ChecklistInstanceComponent,
    title: 'New Inspection'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InspectionChecklistRoutingModule { }