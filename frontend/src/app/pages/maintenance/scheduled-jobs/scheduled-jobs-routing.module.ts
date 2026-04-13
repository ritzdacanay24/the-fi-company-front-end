import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { ScheduledJobsComponent } from "./scheduled-jobs.component";
import { ScheduledJobsListComponent } from "./scheduled-jobs-list/scheduled-jobs-list.component";

const routes: Routes = [
  {
    path: "",
    component: ScheduledJobsComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: ScheduledJobsListComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScheduledJobsRoutingModule {}
