import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-mrb",
  templateUrl: "./mrb.component.html",
  styleUrls: [],
})
export class MrbComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "MRB";

  icon = "mdi mdi-cogs";
}
