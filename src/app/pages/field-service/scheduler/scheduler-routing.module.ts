
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { SchedulerComponent } from './scheduler.component';
import { CalendarComponent } from './calendar/calendar.component';
import { TechSchedulePageComponent } from './tech-schedule/tech-schedule-page/tech-schedule-page.component';

const routes: Routes = [
  {
    path: '',
    component: SchedulerComponent,
    children: [
      {
        path: '',
        redirectTo: 'calendar',
        pathMatch: 'full'
      },
      {
        path: 'calendar',
        component: CalendarComponent
      },
      {
        title: "Tech Schedule",
        path: 'tech-schedule',
        component: TechSchedulePageComponent
      }
    ]
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    NgbNavModule
  ],
  exports: [RouterModule]
})
export class SchedulerRoutingModule { }
