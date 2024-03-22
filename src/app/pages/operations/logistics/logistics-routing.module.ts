
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { DailyReportComponent } from './daily-report/daily-report.component';
import { LogisticsComponent } from './logistics.component';
import { CalendarComponent } from './calendar/calendar.component';

const routes: Routes = [
  {
    path: '',
    component: LogisticsComponent,
    children: [
      {
        path: '',
        redirectTo: 'daily-report',
        pathMatch: 'full'
      },
      {
        path: 'daily-report',
        component: DailyReportComponent
      },
      {
        path: 'calendar',
        component: CalendarComponent
      },
    ]
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class LogisticsRoutingModule { }
