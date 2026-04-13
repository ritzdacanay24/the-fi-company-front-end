import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { MrbComponent } from "./mrb.component";
import { MrbListComponent } from "./mrb-list/mrb-list.component";
import { MrbEditComponent } from "./mrb-edit/mrb-edit.component";
import { MrbCreateComponent } from "./mrb-create/mrb-create.component";

const routes: Routes = [
  {
    path: "",
    component: MrbComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: MrbListComponent,
      },
      {
        path: "edit",
        component: MrbEditComponent,
      },
      {
        path: "create",
        component: MrbCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MrbRoutingModule {}
