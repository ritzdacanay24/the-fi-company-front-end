import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-vehicle-inspection",
  templateUrl: "./vehicle-inspection.component.html",
  styleUrls: [],
})
export class VehicleInspectionComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Vehicle Inspection";

  icon = "mdi-account-group";
}
