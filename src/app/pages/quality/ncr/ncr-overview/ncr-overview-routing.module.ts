
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NcrMainComponent } from './ncr-main/ncr-main.component';
import { NcrOverviewComponent } from './ncr-overview.component';

const routes: Routes = [
  {
    path: '',
    component: NcrOverviewComponent,
    children: [
      {
        path: '',
        redirectTo: 'ncr-main',
        pathMatch: 'full'
      },
      {
        path: 'ncr-main',
        component: NcrMainComponent
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
export class NcrOverviewRoutingModule { }
