import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-org-chart",
  templateUrl: "./org-chart.component.html",
  styleUrls: [],
})
export class OrgChartComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "Org Chart";

  icon = "mdi-cogs";
}
