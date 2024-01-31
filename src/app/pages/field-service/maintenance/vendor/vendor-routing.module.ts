
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { VendorComponent } from './vendor.component';
import { VendorListComponent } from './vendor-list/vendor-list.component';
import { VendorEditComponent } from './vendor-edit/vendor-edit.component';
import { VendorCreateComponent } from './vendor-create/vendor-create.component';

const routes: Routes = [
  {
    path: '',
    component: VendorComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: VendorListComponent
      },
      {
        path: 'edit',
        component: VendorEditComponent
      },
      {
        path: 'create',
        component: VendorCreateComponent
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
export class VendorRoutingModule { }
