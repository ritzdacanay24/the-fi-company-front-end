import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-forklift-inspection",
  templateUrl: "./forklift-inspection.component.html",
  styleUrls: [],
})
export class ForkliftInspectionComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "forklift Inspection";

  icon = "mdi-account-group";
}
