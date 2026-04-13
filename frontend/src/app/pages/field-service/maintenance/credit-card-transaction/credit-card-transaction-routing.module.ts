import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { CreditCardTransactionComponent } from "./credit-card-transaction.component";
import { CreditCardTransactionListComponent } from "./credit-card-transaction-list/credit-card-transaction.component";

const routes: Routes = [
  {
    path: "",
    component: CreditCardTransactionComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: CreditCardTransactionListComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreditCardTransactionRoutingModule {}
