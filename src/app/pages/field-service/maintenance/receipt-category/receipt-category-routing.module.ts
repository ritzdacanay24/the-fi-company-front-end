import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";
import { ReceiptCategoryComponent } from "./receipt-category.component";
import { ReceiptCategoryListComponent } from "./receipt-category-list/receipt-category-list.component";
import { ReceiptCategoryEditComponent } from "./receipt-category-edit/receipt-category-edit.component";
import { ReceiptCategoryCreateComponent } from "./receipt-category-create/receipt-category-create.component";
import { AccessGuard } from "@app/core/guards/access.guard";

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
        title: "List Receipt",
        path: "list",
        component: ReceiptCategoryListComponent,
      },
      {
        title: "Edit Receipt",
        path: "edit",
        component: ReceiptCategoryEditComponent,
      },
      {
        title: "Create Receipt",
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
