import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PropertyComponent } from "./property.component";
import { PropertyListComponent } from "./property-list/property-list.component";
import { PropertyCreateComponent } from "./property-create/property-create.component";
import { PropertyEditComponent } from "./property-edit/property-edit.component";

const routes: Routes = [
  {
    path: "",
    component: PropertyComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: PropertyListComponent,
      },
      {
        path: "edit",
        component: PropertyEditComponent,
      },
      {
        path: "create",
        component: PropertyCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PropertyRoutingModule {}
