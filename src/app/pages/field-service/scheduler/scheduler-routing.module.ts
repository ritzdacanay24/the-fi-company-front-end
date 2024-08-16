import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { SchedulerComponent } from "./scheduler.component";
import { CalendarComponent } from "./calendar/calendar.component";
import { TechSchedulePageComponent } from "./tech-schedule/tech-schedule-page/tech-schedule-page.component";
import { AccessGuard } from "@app/core/guards/access.guard";

const routes: Routes = [
  {
    path: "",
    component: SchedulerComponent,
    children: [
      {
        path: "",
        title: "Field Service Calendar",
        redirectTo: "calendar",
        pathMatch: "full",
      },
      {
        title: "Field Service Calendar",
        path: "calendar",
        component: CalendarComponent,
      },
      {
        title: "Tech Schedule",
        path: "tech-schedule",
        component: TechSchedulePageComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), NgbNavModule],
  exports: [RouterModule],
})
export class SchedulerRoutingModule {}
