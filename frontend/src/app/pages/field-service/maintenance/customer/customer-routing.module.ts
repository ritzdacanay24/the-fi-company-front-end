import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { CustomerComponent } from "./customer.component";
import { CustomerCreateComponent } from "./customer-create/customer-create.component";
import { CustomerListComponent } from "./customer-list/customer-list.component";
import { CustomerEditComponent } from "./customer-edit/customer-edit.component";
const routes: Routes = [
  {
    path: "",
    component: CustomerComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: CustomerListComponent,
      },
      {
        path: "edit",
        component: CustomerEditComponent,
      },
      {
        path: "create",
        component: CustomerCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerRoutingModule {}
