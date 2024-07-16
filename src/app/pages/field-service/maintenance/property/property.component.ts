import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-property",
  templateUrl: "./property.component.html",
  styleUrls: [],
})
export class PropertyComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Properties";

  icon: string = "mdi-office-building-marker";
}
