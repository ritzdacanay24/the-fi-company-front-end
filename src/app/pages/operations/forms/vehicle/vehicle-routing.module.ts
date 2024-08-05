import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

import { VehicleListComponent } from "./vehicle-list/vehicle-list.component";
import { VehicleComponent } from "./vehicle.component";
import { VehicleEditComponent } from "./vehicle-edit/vehicle-edit.component";
import { VehicleCreateComponent } from "./vehicle-create/vehicle-create.component";
import { CanDeactivateGuard } from "@app/core/guards/CanDeactivateGuard";

const routes: Routes = [
  {
    path: "",
    component: VehicleComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: VehicleListComponent,
      },
      {
        path: "edit",
        component: VehicleEditComponent,
        canDeactivate: [CanDeactivateGuard],
      },
      {
        path: "create",
        component: VehicleCreateComponent,
        canDeactivate: [CanDeactivateGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VehicleRoutingModule {}
