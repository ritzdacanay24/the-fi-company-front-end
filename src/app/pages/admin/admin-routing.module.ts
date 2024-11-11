import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { QueryComponent } from "./query/query.component";
import { AccessGuard } from "@app/core/guards/access.guard";
import { LogComponent } from "./log/log.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "query",
    pathMatch: "full",
  },
  {
    path: "query",
    component: QueryComponent,
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
  {
    path: "log",
    component: LogComponent,
    canActivate: [AccessGuard],
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), NgbNavModule],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
