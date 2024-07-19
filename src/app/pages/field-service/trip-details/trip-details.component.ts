import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-trip-details",
  templateUrl: "./trip-details.component.html",
  styleUrls: [],
})
export class TripDetailsComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "Trip Details";

  icon = "mdi mdi-note-plus-outline";
}
