import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { CycleTimeComponent } from "./cycle-time.component";
import { CycleTimeListComponent } from "./cycle-time-list/cycle-time-list.component";

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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CycleTimeRoutingModule {}
