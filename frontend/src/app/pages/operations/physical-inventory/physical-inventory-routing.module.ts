
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { TagsComponent } from './tags/tags.component';

const routes: Routes = [
  {
    path: '',
    component: TagsComponent,
    children: [
      {
        path: '',
        redirectTo: 'tags',
        pathMatch: 'full'
      },
      {
        path: 'tags',
        component: TagsComponent
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
export class PhysicalInventoryRoutingModule { }
