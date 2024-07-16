import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { PlacardComponent } from "./placard.component";
import { PlacardListComponent } from "./placard-list/placard-list.component";
import { PlacardCreateComponent } from "./placard-create/placard-create.component";
import { PlacardEditComponent } from "./placard-edit/placard-edit.component";

const routes: Routes = [
  {
    path: "",
    component: PlacardComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: PlacardListComponent,
      },
      {
        path: "edit",
        component: PlacardEditComponent,
      },
      {
        path: "create",
        component: PlacardCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlacardRoutingModule {}
