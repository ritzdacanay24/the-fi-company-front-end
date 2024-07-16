import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-email-notification",
  templateUrl: "./email-notification.component.html",
  styleUrls: [],
})
export class EmailNotificationComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Email Notifications";

  icon = "mdi-account-group";

  //select which scheduled job users would like to be added to
  //must also select user./
}
