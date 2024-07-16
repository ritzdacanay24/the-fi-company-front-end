import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { ServiceTypeListComponent } from "./service-type-list/service-type-list.component";
import { ServiceTypeCreateComponent } from "./service-type-create/service-type-create.component";
import { ServiceTypeComponent } from "./service-type.component";
import { ServiceTypeEditComponent } from "./service-type-edit/service-type-edit.component";

const routes: Routes = [
  {
    path: "",
    component: ServiceTypeComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: ServiceTypeListComponent,
      },
      {
        path: "edit",
        component: ServiceTypeEditComponent,
      },
      {
        path: "create",
        component: ServiceTypeCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ServiceTypeRoutingModule {}
