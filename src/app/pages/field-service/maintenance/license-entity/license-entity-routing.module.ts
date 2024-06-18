import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LicenseEntityEditComponent } from './license-entity-edit/license-entity-edit.component';
import { LicenseEntityListComponent } from './license-entity-list/license-entity-list.component';
import { LicenseEntityComponent } from './license-entity.component';
import { LicenseEntityCreateComponent } from './license-entity-create/license-entity-create.component';

const routes: Routes = [
  {
    path: '',
    component: LicenseEntityComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: LicenseEntityListComponent
      },
      {
        path: 'edit',
        component: LicenseEntityEditComponent
      },
      {
        path: 'create',
        component: LicenseEntityCreateComponent
      }
    ]
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LicenseEntityRoutingModule { }
