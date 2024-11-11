import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { CycleTimeComponent } from "./cycle-time.component";
import { CycleTimeListComponent } from "./cycle-time-list/cycle-time-list.component";
import { AvailabilityListComponent } from "./availability-list/availability-list.component";
import { CycleTimeChartComponent } from "./cycle-time-chart/cycle-time-chart.component";

const routes: Routes = [
  {
    path: "",
    component: CycleTimeComponent,
    children: [
      {
        title: "Cycle Time List",
        path: "list",
        component: CycleTimeListComponent,
      },
      {
        title: "Availability List",
        path: "availability-list",
        component: AvailabilityListComponent,
      },
      {
        title: "Cycle Time Chart",
        path: "chart",
        component: CycleTimeChartComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CycleTimeRoutingModule {}
