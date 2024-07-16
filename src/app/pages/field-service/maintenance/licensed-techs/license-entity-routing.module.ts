import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { LicensedTechsCreateComponent } from "./licensed-techs-create/licensed-techs-create.component";
import { LicensedTechsEditComponent } from "./licensed-techs-edit/licensed-techs-edit.component";
import { LicensedTechsComponent } from "./license-entity.component";

const routes: Routes = [
  {
    path: "",
    component: LicensedTechsComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "edit",
        component: LicensedTechsEditComponent,
      },
      {
        path: "create",
        component: LicensedTechsCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LicensedTechsRoutingModule {}
