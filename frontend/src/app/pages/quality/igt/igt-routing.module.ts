import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { IgtListComponent } from "./igt-list/igt-list.component";
import { SerialNumberManagerComponent } from "./serial-number-manager/serial-number-manager.component";
import { SerialNumberUploadComponent } from "./serial-number-upload/serial-number-upload.component";
import { IgtComponent } from "@app/pages/quality/igt/igt.component";
import { IgtFormPageComponent } from "./igt-form-page/igt-form-page.component";
import { IgtManageExistingComponent } from "./igt-manage-existing/igt-manage-existing.component";

const routes: Routes = [
  {
    path: "",
    component: IgtComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: IgtListComponent,
      },
      {
        path: "edit",
        component: IgtFormPageComponent,
      },
      {
        path: "create",
        component: IgtFormPageComponent,
      },
      {
        path: "serial-manager",
        component: SerialNumberManagerComponent,
      },
      {
        path: "serial-upload",
        component: SerialNumberUploadComponent,
      },
      {
        path: "manage-existing",
        component: IgtManageExistingComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IgtRoutingModule {}
