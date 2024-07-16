import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { LabelsComponent } from "./labels.component";
import { LabelsListComponent } from "./labels-list/labels-list.component";

const routes: Routes = [
  {
    path: "",
    component: LabelsComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: LabelsListComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LabelsRoutingModule {}
