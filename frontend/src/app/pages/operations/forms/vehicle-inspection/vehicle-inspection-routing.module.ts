import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { VehicleInspectionComponent } from "./vehicle-inspection.component";
import { VehicleInspectionListComponent } from "./vehicle-inspection-list/vehicle-inspection-list.component";
import { VehicleInspectionCreateComponent } from "./vehicle-inspection-create/vehicle-inspection-create.component";
import { VehicleInspectionEditComponent } from "./vehicle-inspection-edit/vehicle-inspection-edit.component";

const routes: Routes = [
  {
    path: "",
    component: VehicleInspectionComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: VehicleInspectionListComponent,
      },
      {
        path: "edit",
        component: VehicleInspectionEditComponent,
      },
      {
        path: "create",
        component: VehicleInspectionCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VehicleInspectionRoutingModule {}
