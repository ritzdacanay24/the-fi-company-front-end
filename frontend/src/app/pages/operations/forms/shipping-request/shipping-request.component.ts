import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-shipping-request",
  templateUrl: "./shipping-request.component.html",
  styleUrls: [],
})
export class ShippingRequestComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Shipping Request";

  icon = "mdi-account-group";
}
