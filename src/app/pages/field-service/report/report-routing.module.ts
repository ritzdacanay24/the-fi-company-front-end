
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { ReportComponent } from './report.component';
import { ReportMainComponent } from './report-main/report-main.component';
import { JobsByLocationComponent } from './jobs-by-location/jobs-by-location.component';
import { PlatformAvgComponent } from './platform-avg/platform-avg.component';
import { ExpenseReportComponent } from './expense-report/expense-report.component';
import { ServiceReportComponent } from './service-report/service-report.component';
import { CustomerReportComponent } from './customer-report/customer-report.component';
import { InvoiceReportComponent } from './invoice-report/invoice-report.component';
import { JobByUserReportComponent } from './job-by-user-report/job-by-user-report.component';
import { ContractorVsTechComponent } from './contractor-vs-tech-report/contractor-vs-tech-report.component';
import { TicketEventReportComponent } from './ticket-event-report/ticket-event-report.component';

const routes: Routes = [
  {
    path: '',
    component: ReportComponent,
    children: [
      {
        path: '',
        redirectTo: 'report-main',
        pathMatch: 'full'
      },
      {
        path: 'report-main',
        component: ReportMainComponent
      },
      {
        path: 'jobs-by-location',
        component: JobsByLocationComponent,
      },
      {
        path: 'platform-avg',
        component: PlatformAvgComponent,
      },
      {
        path: 'expense-report',
        component: ExpenseReportComponent,
      },
      {
        path: 'service-report',
        component: ServiceReportComponent,
      },
      {
        path: 'customer-report',
        component: CustomerReportComponent,
      },
      {
        path: 'invoice-report',
        component: InvoiceReportComponent,
      },
      {
        path: 'job-by-user-report',
        component: JobByUserReportComponent,
      },
      {
        path: 'contractor-vs-tech-report',
        component: ContractorVsTechComponent,
      },
      {
        path: 'ticket-event-report',
        component: TicketEventReportComponent,
      }
    ]
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ReportRoutingModule { }
