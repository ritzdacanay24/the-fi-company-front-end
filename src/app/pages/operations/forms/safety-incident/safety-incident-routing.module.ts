import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { SafetyIncidentComponent } from "./safety-incident.component";
import { SafetyIncidentListComponent } from "./safety-incident-list/safety-incident-list.component";
import { SafetyIncidentCreateComponent } from "./safety-incident-create/safety-incident-create.component";
import { SafetyIncidentEditComponent } from "./safety-incident-edit/safety-incident-edit.component";
import { SafetyIncidentViewComponent } from "./safety-incident-view/safety-incident-view.component";
import { SafetyDashboardComponent } from "./safety-dashboard/safety-dashboard.component";
import { CanDeactivateGuard } from "@app/core/guards/CanDeactivateGuard";

const routes: Routes = [
  {
    path: "",
    component: SafetyIncidentComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: SafetyIncidentListComponent,
      },
      {
        path: "dashboard",
        component: SafetyDashboardComponent,
      },
      {
        path: "edit",
        component: SafetyIncidentEditComponent,
        canDeactivate: [CanDeactivateGuard],
      },
      {
        path: "view",
        component: SafetyIncidentViewComponent,
      },
      {
        path: "create",
        component: SafetyIncidentCreateComponent,
        canDeactivate: [CanDeactivateGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SafetyIncidentRoutingModule {}
