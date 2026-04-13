import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { NcrComponent } from "./ncr.component";
import { NcrListComponent } from "./ncr-list/ncr-list.component";
import { NcrOverviewComponent } from "./ncr-overview/ncr-overview.component";
import { NcrCreateComponent } from "./ncr-create/ncr-create.component";
import { CanDeactivateGuard } from "@app/core/guards/CanDeactivateGuard";

const routes: Routes = [
  {
    path: "",
    component: NcrComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: NcrListComponent,
      },
      {
        path: "create",
        component: NcrCreateComponent,
        canDeactivate: [CanDeactivateGuard],
      },
    ],
  },
  {
    path: "overview",
    component: NcrOverviewComponent,
    canDeactivate: [CanDeactivateGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NcrRoutingModule {}
