import { Routes, RouterModule } from "@angular/router";
import { NgModule } from "@angular/core";

import { MaterialRequestComponent } from "./material-request.component";
import { MaterialRequestListComponent } from "./material-request-list/material-request-list.component";
import { MaterialRequestEditComponent } from "./material-request-edit/material-request-edit.component";
import { MaterialRequestCreateComponent } from "./material-request-create/material-request-create.component";
import { MaterialRequestPickingComponent } from "./material-request-picking/material-request-picking.component";
import { MaterialRequestValidateListComponent } from "./material-request-validate-list/material-request-validate-list.component";
import { MaterialRequestWorkflowComponent } from "./material-request-workflow/material-request-workflow.component";
import { MaterialRequestValidationImprovedComponent } from "./material-request-validation-improved/material-request-validation-improved.component";
import { MaterialRequestPickingImprovedComponent } from "./material-request-picking-improved/material-request-picking-improved.component";
import { MaterialRequestCompletionComponent } from "./material-request-completion/material-request-completion.component";
import { MaterialRequestReviewerDashboardComponent } from "@app/pages/operations/material-request/material-request-reviewer-dashboard/material-request-reviewer-dashboard.component";
import { MaterialRequestAdminReviewDashboardComponent } from "@app/pages/operations/material-request/material-request-admin-review-dashboard/material-request-admin-review-dashboard.component";
import { MaterialRequestKanbanComponent } from "@app/pages/operations/material-request/material-request-kanban/material-request-kanban.component";

const routes: Routes = [
  {
    path: "",
    component: MaterialRequestComponent,
    children: [
      {
        path: "",
        redirectTo: "kanban",
        pathMatch: "full",
      },
      {
        title: "Material Request Dashboard",
        path: "kanban",
        component: MaterialRequestKanbanComponent,
      },
      {
        title: "List MR",
        path: "list",
        component: MaterialRequestListComponent,
      },
      {
        title: "Edit MR",
        path: "edit",
        component: MaterialRequestEditComponent,
      },
      {
        title: "Create MR",
        path: "create",
        component: MaterialRequestCreateComponent,
      },
      {
        title: "Validate MR",
        path: "validate-list",
        component: MaterialRequestValidateListComponent,
      },
      {
        title: "MR Picking",
        path: "picking",
        component: MaterialRequestPickingComponent,
      },
      {
        title: "MR Review Dashboard",
        path: "review",
        component: MaterialRequestReviewerDashboardComponent,
      },
      {
        title: "Admin Review Dashboard",
        path: "admin-reviews",
        component: MaterialRequestAdminReviewDashboardComponent,
      },
      
      {
        title: "New MR Workflow",
        path: "workflow",
        component: MaterialRequestWorkflowComponent,
      },
      {
        title: "MR Validation Improved",
        path: "validation-improved",
        component: MaterialRequestValidationImprovedComponent,
      },
      {
        title: "MR Picking Improved",
        path: "picking-improved",
        component: MaterialRequestPickingImprovedComponent,
      },
      {
        title: "MR Completion",
        path: "completion",
        component: MaterialRequestCompletionComponent,
      },
    ],
  },
  {
    title: "MR Picking",
    path: "picking",
    component: MaterialRequestPickingComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MaterialRequestRoutingModule {}
