import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { ShippingRequestListComponent } from "./shipping-request-list/shipping-request-list.component";
import { ShippingRequestCreateComponent } from "./shipping-request-create/shipping-request-create.component";
import { ShippingRequestEditComponent } from "./shipping-request-edit/shipping-request-edit.component";
import { ShippingRequestComponent } from "./shipping-request.component";

const routes: Routes = [
  {
    path: "",
    component: ShippingRequestComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: ShippingRequestListComponent,
      },
      {
        path: "edit",
        component: ShippingRequestEditComponent,
      },
      {
        path: "create",
        component: ShippingRequestCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShippingRequestRoutingModule {}
