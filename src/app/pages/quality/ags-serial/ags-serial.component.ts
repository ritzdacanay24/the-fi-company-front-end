import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-ags-serial",
  templateUrl: "./ags-serial.component.html",
  styleUrls: [],
})
export class AgsSerialComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "AGS Serial";

  icon = "mdi mdi-cogs";
}
