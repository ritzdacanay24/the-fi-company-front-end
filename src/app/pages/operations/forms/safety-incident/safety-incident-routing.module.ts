import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { SafetyIncidentComponent } from "./safety-incident.component";
import { SafetyIncidentListComponent } from "./safety-incident-list/safety-incident-list.component";
import { SafetyIncidentCreateComponent } from "./safety-incident-create/safety-incident-create.component";
import { SafetyIncidentEditComponent } from "./safety-incident-edit/safety-incident-edit.component";
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
        path: "edit",
        component: SafetyIncidentEditComponent,
        canDeactivate: [CanDeactivateGuard],
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
