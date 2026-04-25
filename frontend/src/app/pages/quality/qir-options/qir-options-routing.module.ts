import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { QirOptionsComponent } from './qir-options.component';
import { QirOptionsListComponent } from './qir-options-list/qir-options-list.component';

const routes: Routes = [
  {
    path: '',
    component: QirOptionsComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: QirOptionsListComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QirOptionsRoutingModule {}
