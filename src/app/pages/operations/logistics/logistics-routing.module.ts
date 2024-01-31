
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { DailyReportComponent } from './daily-report/daily-report.component';
import { LogisticsComponent } from './logistics.component';

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
