import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-igt",
  templateUrl: "./igt.component.html",
  styleUrls: [],
})
export class IgtComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "IGT";

  icon = "mdi mdi-gamepad-variant";
}
