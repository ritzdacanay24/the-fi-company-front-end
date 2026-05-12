import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { SafetyIncidentPublicComponent } from "./safety-incident-public.component";
import { SafetyIncidentCreatePublicComponent } from "./safety-incident-create-public.component";

const routes: Routes = [
  {
    path: "",
    component: SafetyIncidentPublicComponent,
    children: [
      {
        path: "",
        redirectTo: "create",
        pathMatch: "full",
      },
      {
        path: "create",
        component: SafetyIncidentCreatePublicComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SafetyIncidentPublicRoutingModule {}
