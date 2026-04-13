import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { RmaComponent } from "./rma.component";
import { RmaListComponent } from "./rma-list/rma-list.component";
import { RmaEditComponent } from "./rma-edit/rma-edit.component";
import { RmaCreateComponent } from "./rma-create/rma-create.component";

const routes: Routes = [
  {
    path: "",
    component: RmaComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: RmaListComponent,
      },
      {
        path: "edit",
        component: RmaEditComponent,
      },
      {
        path: "create",
        component: RmaCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RmaRoutingModule {}
