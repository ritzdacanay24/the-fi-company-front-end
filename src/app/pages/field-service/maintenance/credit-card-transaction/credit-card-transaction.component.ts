import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "src/app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-credit-card-transaction",
  templateUrl: "./credit-card-transaction.component.html",
  styleUrls: [],
})
export class CreditCardTransactionComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Credit Card";

  icon = "mdi-credit-card-multiple-outline";
}
