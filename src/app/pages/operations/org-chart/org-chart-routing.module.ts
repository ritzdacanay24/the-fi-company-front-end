import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { OrgChartViewComponent } from "./org-chart-view/org-chart-view.component";
import { OrgChartComponent } from "./org-chart.component";

const routes: Routes = [
  {
    path: "",
    component: OrgChartComponent,
    children: [
      {
        path: "org-chart-view",
        component: OrgChartViewComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrgChartRoutingModule {}
