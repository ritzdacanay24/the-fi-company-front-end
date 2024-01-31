
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { EventComponent } from './event.component';
import { EventListComponent } from './event-list/event-list.component';
import { EventEditComponent } from './event-edit/event-edit.component';
import { EventCreateComponent } from './event-create/event-create.component';

const routes: Routes = [
  {
    path: '',
    component: EventComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: EventListComponent
      },
      {
        path: 'edit',
        component: EventEditComponent
      },
      {
        path: 'create',
        component: EventCreateComponent
      }
    ]
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class EventRoutingModule { }
