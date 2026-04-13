import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "src/app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-vendor",
  templateUrl: "./vendor.component.html",
  styleUrls: [],
})
export class VendorComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Vendors";

  icon = "mdi-account-group";
}
