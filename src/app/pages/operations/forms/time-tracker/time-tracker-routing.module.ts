import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { TimeTrackerComponent } from "./time-tracker.component";
import { TimeTrackerListComponent } from "../time-tracker-list/time-tracker-list.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "list",
    pathMatch: "full",
  },
  {
    title: "Time Sessions",
    path: "list",
    component: TimeTrackerListComponent,
    runGuardsAndResolvers: "always",
  },
  {
    title: "Active Time Session",
    path: "create",
    component: TimeTrackerComponent,
    runGuardsAndResolvers: "always",
  },
  {
    title: "Time Session Details",
    path: ":id",
    component: TimeTrackerComponent,
    runGuardsAndResolvers: "always",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TimeTrackerRoutingModule {}