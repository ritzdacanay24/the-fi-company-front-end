
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { QirListComponent } from './qir-list/qir-list.component';
import { QirComponent } from './qir.component';
import { QirEditComponent } from './qir-edit/qir-edit.component';
import { QirCreateComponent } from './qir-create/qir-create.component';

const routes: Routes = [
  {
    path: '',
    component: QirComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: QirListComponent
      },
      {
        path: 'edit',
        component: QirEditComponent
      },
      {
        path: 'create',
        component: QirCreateComponent
      },
    ]
  },
  {
    path: 'settings',
    loadChildren: () => import('../qir-settings/qir-settings-routing.module').then(m => m.QirSettingsRoutingModule)
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class QirRoutingModule { }
