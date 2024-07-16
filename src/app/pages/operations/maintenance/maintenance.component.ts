import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-maintenance",
  templateUrl: "./maintenance.component.html",
  styleUrls: [],
})
export class MaintenanceComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "Maintenance";

  icon = "mdi-cogs";
}
