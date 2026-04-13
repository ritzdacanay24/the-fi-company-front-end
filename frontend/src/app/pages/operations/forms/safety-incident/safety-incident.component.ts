import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-safety-incident",
  templateUrl: "./safety-incident.component.html",
  styleUrls: [],
})
export class SafetyIncidentComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "safety-incident";

  icon = "mdi-account-group";
}
