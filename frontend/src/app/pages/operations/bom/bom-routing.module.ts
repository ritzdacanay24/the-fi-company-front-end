import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { BomGraphicsComponent } from "@app/pages/operations/bom/bom-graphics/bom-graphics.component";
import { BomViewComponent } from "@app/pages/operations/bom/bom-view/bom-view.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "graphics",
    pathMatch: "full",
  },
  {
    path: "graphics",
    component: BomGraphicsComponent,
  },
  {
    path: "view",
    component: BomViewComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BomRoutingModule {}
