import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { AgsSerialComponent } from "./ags-serial.component";
import { AgsSerialListComponent } from "./ags-serial-list/ags-serial-list.component";
import { AgsSerialEditComponent } from "./ags-serial-edit/ags-serial-edit.component";
import { AgsSerialCreateComponent } from "./ags-serial-create/ags-serial-create.component";

const routes: Routes = [
  {
    path: "",
    component: AgsSerialComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: AgsSerialListComponent,
      },
      {
        path: "edit",
        component: AgsSerialEditComponent,
      },
      {
        path: "create",
        component: AgsSerialCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgsSerialRoutingModule {}
