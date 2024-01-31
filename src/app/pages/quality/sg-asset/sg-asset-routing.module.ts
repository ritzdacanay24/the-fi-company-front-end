
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { SgAssetComponent } from './sg-asset.component';
import { SgAssetListComponent } from './sg-asset-list/sg-asset-list.component';
import { SgAssetEditComponent } from './sg-asset-edit/sg-asset-edit.component';
import { SgAssetCreateComponent } from './sg-asset-create/sg-asset-create.component';

const routes: Routes = [
  {
    path: '',
    component: SgAssetComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: SgAssetListComponent
      },
      {
        path: 'edit',
        component: SgAssetEditComponent
      },
      {
        path: 'create',
        component: SgAssetCreateComponent
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
export class SgAssetRoutingModule { }
