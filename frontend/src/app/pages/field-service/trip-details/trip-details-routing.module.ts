import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { TripDetailsCreateComponent } from "./trip-details-create/trip-details-create.component";
import { TripDetailsComponent } from "./trip-details.component";
import { TripDetailsListComponent } from "./trip-details-list/trip-details-list.component";
import { TripDetailsEditComponent } from "./trip-details-edit/trip-details-edit.component";
import { TripSummaryEditComponent } from "./trip-summary-edit/trip-summary-edit.component";

const routes: Routes = [
  {
    path: "",
    component: TripDetailsComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: TripDetailsListComponent,
      },
      {
        path: "edit",
        component: TripDetailsEditComponent,
      },
      {
        path: "edit-summary",
        component: TripSummaryEditComponent,
      },
      {
        path: "create",
        component: TripDetailsCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TripDetailsRoutingModule {}
