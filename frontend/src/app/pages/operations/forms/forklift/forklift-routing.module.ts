import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ForkliftComponent } from './forklift.component';
import { ForkliftListComponent } from './forklift-list/forklift-list.component';
import { ForkliftCreateComponent } from './forklift-create/forklift-create.component';
import { ForkliftEditComponent } from './forklift-edit/forklift-edit.component';

const routes: Routes = [
  {
    path: '',
    component: ForkliftComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ForkliftListComponent },
      { path: 'create', component: ForkliftCreateComponent },
      { path: 'edit', component: ForkliftEditComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ForkliftRoutingModule {}
