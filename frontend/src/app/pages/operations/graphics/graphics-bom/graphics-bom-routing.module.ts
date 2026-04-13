import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { GraphicsBomComponent } from "./graphics-bom.component";
import { GraphicsBomListComponent } from "./graphics-bom-list/graphics-bom-list.component";
import { GraphicsBomEditComponent } from "./graphics-bom-edit/graphics-bom-edit.component";
import { GraphicsBomCreateComponent } from "./graphics-bom-create/graphics-bom-create.component";

const routes: Routes = [
  {
    path: "",
    component: GraphicsBomComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: GraphicsBomListComponent,
      },
      {
        path: "edit",
        component: GraphicsBomEditComponent,
      },
      {
        path: "create",
        component: GraphicsBomCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GraphicsBomRoutingModule {}
