import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { InspectionChecklistRoutingModule } from './inspection-checklist-routing.module';
import { InspectionDashboardComponent } from './components/inspection-dashboard/inspection-dashboard.component';
import { ChecklistTemplateManagerComponent } from './checklist-template-manager/checklist-template-manager.component';
import { ChecklistInstanceComponent } from './components/checklist-instance/checklist-instance.component';
import { ChecklistTemplateMockService } from './services/checklist-template-mock.service';

@NgModule({
  declarations: [
    // Note: Since these are standalone components, they don't need to be declared here
    // They will be imported directly in the routing module
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InspectionChecklistRoutingModule
  ],
  providers: [
    ChecklistTemplateMockService
  ]
})
export class InspectionChecklistModule { }