import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "src/app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-customer",
  templateUrl: "./customer.component.html",
  styleUrls: [],
})
export class CustomerComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Customers";

  icon = "mdi-account-group";
}
