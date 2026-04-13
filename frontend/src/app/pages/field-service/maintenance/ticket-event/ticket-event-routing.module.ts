import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { TicketEventComponent } from "./ticket-event.component";
import { TicketEventCreateComponent } from "./ticket-event-create/ticket-event-create.component";
import { TicketEventEditComponent } from "./ticket-event-edit/ticket-event-edit.component";
import { TicketEventListComponent } from "./ticket-event-list/ticket-event-list.component";

const routes: Routes = [
  {
    path: "",
    component: TicketEventComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: TicketEventListComponent,
      },
      {
        path: "edit",
        component: TicketEventEditComponent,
      },
      {
        path: "create",
        component: TicketEventCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TicketEventRoutingModule {}
