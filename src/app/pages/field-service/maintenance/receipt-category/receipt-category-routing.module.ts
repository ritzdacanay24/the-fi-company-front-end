import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { ReceiptCategoryComponent } from "./receipt-category.component";
import { ReceiptCategoryListComponent } from "./receipt-category-list/receipt-category-list.component";
import { ReceiptCategoryEditComponent } from "./receipt-category-edit/receipt-category-edit.component";
import { ReceiptCategoryCreateComponent } from "./receipt-category-create/receipt-category-create.component";

const routes: Routes = [
  {
    path: "",
    component: ReceiptCategoryComponent,
    children: [
      {
        path: "",
        redirectTo: "list",
        pathMatch: "full",
      },
      {
        path: "list",
        component: ReceiptCategoryListComponent,
      },
      {
        path: "edit",
        component: ReceiptCategoryEditComponent,
      },
      {
        path: "create",
        component: ReceiptCategoryCreateComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReceiptCategoryRoutingModule {}
