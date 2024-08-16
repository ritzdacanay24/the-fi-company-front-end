import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { SideMenuConfigComponent } from "./side-menu-config.component";
import { SideMenuConfigListComponent } from "./side-menu-config-list/side-menu-config-list.component";

const routes: Routes = [
  {
    path: "",
    component: SideMenuConfigComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: SideMenuConfigListComponent,
      },
      // {
      //   path: "edit",
      //   component: EmailNotificationEditComponent,
      // },
      // {
      //   path: "create",
      //   component: EmailNotificationCreateComponent,
      // },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SideMenuConfigRoutingModule {}
