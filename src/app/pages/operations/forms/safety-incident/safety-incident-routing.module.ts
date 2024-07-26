import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { SafetyIncidentComponent } from "./safety-incident.component";
import { SafetyIncidentListComponent } from "./safety-incident-list/safety-incident-list.component";
import { SafetyIncidentCreateComponent } from "./safety-incident-create/safety-incident-create.component";
import { SafetyIncidentEditComponent } from "./safety-incident-edit/safety-incident-edit.component";

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
      },
      {
        path: "create",
        component: SafetyIncidentCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SafetyIncidentRoutingModule {}
