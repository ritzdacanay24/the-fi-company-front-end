import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { QirListComponent } from "./qir-list/qir-list.component";
import { QirComponent } from "./qir.component";
import { QirEditComponent } from "./qir-edit/qir-edit.component";
import { QirCreateComponent } from "./qir-create/qir-create.component";
import { QirViewComponent } from "./qir-view/qir-view.component";
import { CanDeactivateGuard } from "@app/core/guards/CanDeactivateGuard";
import { AccessGuard } from "@app/core/guards/access.guard";

const routes: Routes = [
  {
    path: "",
    component: QirComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: QirListComponent,
      },
      {
        path: "edit",
        component: QirEditComponent,
        canDeactivate: [CanDeactivateGuard],
      },
      {
        path: "create",
        component: QirCreateComponent,
        canDeactivate: [CanDeactivateGuard],
      },
      {
        path: "view",
        component: QirViewComponent,
      },
    ],
  },
  {
    path: "settings",
    loadChildren: () =>
      import("../qir-settings/qir-settings-routing.module").then(
        (m) => m.QirSettingsRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QirRoutingModule {}
