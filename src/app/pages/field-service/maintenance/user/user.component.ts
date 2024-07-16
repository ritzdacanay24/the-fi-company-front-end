import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-user",
  templateUrl: "./user.component.html",
  styleUrls: [],
})
export class UserComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Users";

  icon = "mdi-account-group";
}
