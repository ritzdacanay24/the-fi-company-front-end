import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-ncr",
  templateUrl: "./ncr.component.html",
  styleUrls: [],
})
export class NcrComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "NCR";

  icon = "mdi mdi-cogs";
}
