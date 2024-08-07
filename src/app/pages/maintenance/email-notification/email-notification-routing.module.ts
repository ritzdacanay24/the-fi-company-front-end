import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { EmailNotificationListComponent } from "./email-notification-list/email-notification-list.component";
import { EmailNotificationComponent } from "./email-notification.component";
import { EmailNotificationEditComponent } from "./email-notification-edit/email-notification-edit.component";
import { EmailNotificationCreateComponent } from "./email-notification-create/email-notification-create.component";

const routes: Routes = [
  {
    path: "",
    component: EmailNotificationComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: EmailNotificationListComponent,
      },
      {
        path: "edit",
        component: EmailNotificationEditComponent,
      },
      {
        path: "create",
        component: EmailNotificationCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmailNotificationRoutingModule {}
