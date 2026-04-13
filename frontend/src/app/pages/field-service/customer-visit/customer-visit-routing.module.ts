import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { CustomerVisitComponent } from "./customer-visit.component";
import { CustomerVisitListComponent } from "./customer-visit-list/customer-visit-list.component";
import { CustomerVisitEditComponent } from "./customer-visit-edit/customer-visit-edit.component";
import { CustomerVisitCreateComponent } from "./customer-visit-create/customer-visit-create.component";

const routes: Routes = [
  {
    path: "",
    component: CustomerVisitComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: CustomerVisitListComponent,
      },
      {
        path: "create",
        component: CustomerVisitCreateComponent,
      },
      {
        path: "edit",
        component: CustomerVisitEditComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerVisitRoutingModule {}
