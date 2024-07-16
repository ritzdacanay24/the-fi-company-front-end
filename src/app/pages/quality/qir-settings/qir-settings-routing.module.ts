import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { QirSettingsListComponent } from "./qir-settings-list/qir-settings-list.component";
import { QirSettingsComponent } from "./qir-settings.component";
import { QirSettingsEditComponent } from "./qir-settings-edit/qir-settings-edit.component";
import { QirSettingsCreateComponent } from "./qir-settings-create/qir-settings-create.component";

const routes: Routes = [
  {
    path: "",
    component: QirSettingsComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: QirSettingsListComponent,
      },
      {
        path: "edit",
        component: QirSettingsEditComponent,
      },
      {
        path: "create",
        component: QirSettingsCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QirSettingsRoutingModule {}
