import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-cycle-time",
  templateUrl: "./cycle-time.component.html",
  styleUrls: [],
})
export class CycleTimeComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "Cycle Time";

  icon = "mdi-cogs";
}
