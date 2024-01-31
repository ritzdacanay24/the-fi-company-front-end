
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { QueryComponent } from './query/query.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'query',
    pathMatch: 'full'
  },
  {
    path: 'query',
    component: QueryComponent
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    NgbNavModule
  ],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
