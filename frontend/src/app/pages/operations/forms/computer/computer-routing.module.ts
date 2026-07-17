import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComputerComponent } from './computer.component';
import { ComputerListComponent } from './computer-list/computer-list.component';
import { ComputerCreateComponent } from './computer-create/computer-create.component';
import { ComputerEditComponent } from './computer-edit/computer-edit.component';

const routes: Routes = [
  {
    path: '',
    component: ComputerComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ComputerListComponent },
      { path: 'create', component: ComputerCreateComponent },
      { path: 'edit', component: ComputerEditComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComputerRoutingModule {}
