import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { RfqComponent } from "./rfq.component";
import { RfqListComponent } from "./rfq-list/rfq-list.component";
import { RfqCreateComponent } from "./rfq-create/rfq-create.component";
import { RfqEditComponent } from "./rfq-edit/rfq-edit.component";
import { RfqViewComponent } from "./rfq-view/rfq-view.component";

const routes: Routes = [
  {
    path: "",
    component: RfqComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: RfqListComponent,
      },
      {
        path: "view",
        component: RfqViewComponent,
      },
      {
        path: "edit",
        component: RfqEditComponent,
      },
      {
        path: "create",
        component: RfqCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RfqRoutingModule {}
