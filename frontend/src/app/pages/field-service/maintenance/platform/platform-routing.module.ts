import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { PlatformComponent } from "./platform.component";
import { PlatformListComponent } from "./platform-list/platform-list.component";
import { PlatformEditComponent } from "./platform-edit/platform-edit.component";
import { PlatformCreateComponent } from "./platform-create/platform-create.component";

const routes: Routes = [
  {
    path: "",
    component: PlatformComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: PlatformListComponent,
      },
      {
        path: "edit",
        component: PlatformEditComponent,
      },
      {
        path: "create",
        component: PlatformCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlatformRoutingModule {}
