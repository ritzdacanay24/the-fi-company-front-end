import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-side-menu-config",
  templateUrl: "./side-menu-config.component.html",
  styleUrls: [],
})
export class SideMenuConfigComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Side Menu Config";

  icon = "mdi-account-group";
}
