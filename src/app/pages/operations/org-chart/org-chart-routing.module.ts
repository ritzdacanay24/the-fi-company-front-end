import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { OrgChartViewComponent } from "./org-chart-view/org-chart-view.component";
import { OrgChartModernComponent } from "./org-chart-modern/org-chart-modern.component";
import { OrgChartComponent } from "./org-chart.component";

const routes: Routes = [
  {
    path: "",
    component: OrgChartComponent,
    children: [
      {
        title:"Org Chart Las Vegas", 
        path: "org-chart-view",
        component: OrgChartViewComponent,
      },
      {
        title:"Modern Org Chart", 
        path: "org-chart-modern",
        component: OrgChartModernComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrgChartRoutingModule {}
