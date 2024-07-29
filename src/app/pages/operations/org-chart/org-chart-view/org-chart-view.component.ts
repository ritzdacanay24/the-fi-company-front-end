import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { TreeNode } from "primeng/api";
import { OrganizationChartModule } from "primeng/organizationchart";

@Component({
  standalone: true,
  imports: [SharedModule, OrganizationChartModule],
  selector: "app-org-chart-view",
  templateUrl: "./org-chart-view.component.html",
  styleUrls: [],
})
export class OrgChartViewComponent implements OnInit {
  constructor(
    public route: ActivatedRoute, public router: Router
  ) {}

  ngOnInit(): void {}

  title = "Org Chart";

  icon = "mdi-cogs";
  data: TreeNode[] = [
    {
        label: 'F.C Barcelona',
        expanded: true,
        children: [
            {
                label: 'Argentina',
                expanded: true,
                children: [
                    {
                        label: 'Argentina'
                    },
                    {
                        label: 'France'
                    }
                ]
            },
            {
                label: 'France',
                expanded: true,
                children: [
                    {
                        label: 'France'
                    },
                    {
                        label: 'Morocco'
                    }
                ]
            }
        ]
    },
];
}
