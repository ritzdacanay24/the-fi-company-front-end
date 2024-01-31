
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { SchedulerComponent } from './scheduler.component';
import { CalendarComponent } from './calendar/calendar.component';
import { TechScheduleComponent } from './tech-schedule/tech-schedule.component';

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
        path: 'tech-schedule',
        component: TechScheduleComponent
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
