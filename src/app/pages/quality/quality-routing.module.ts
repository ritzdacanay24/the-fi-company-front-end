import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { AccessGuard } from "@app/core/guards/access.guard";

const routes: Routes = [
  {
    path: "",
    redirectTo: "overview",
    pathMatch: "full",
  },
  {
    path: "overview",
    loadChildren: () =>
      import("./overview/overview-routing.module").then(
        (m) => m.OverviewRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "rma",
    loadChildren: () =>
      import("./rma/rma-routing.module").then((m) => m.RmaRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "sg-asset",
    loadChildren: () =>
      import("./sg-asset/sg-asset-routing.module").then(
        (m) => m.SgAssetRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "ags-serial",
    loadChildren: () =>
      import("./ags-serial/ags-serial-routing.module").then(
        (m) => m.AgsSerialRoutingModule
      ),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "mrb",
    loadChildren: () =>
      import("./mrb/mrb-routing.module").then((m) => m.MrbRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "car",
    loadChildren: () =>
      import("./ncr/ncr-routing.module").then((m) => m.NcrRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "qir",
    loadChildren: () =>
      import("./qir/qir-routing.module").then((m) => m.QirRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "mrb",
    loadChildren: () =>
      import("./mrb/mrb-routing.module").then((m) => m.MrbRoutingModule),
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), NgbNavModule],
  exports: [RouterModule],
})
export class QualityRoutingModule {}
