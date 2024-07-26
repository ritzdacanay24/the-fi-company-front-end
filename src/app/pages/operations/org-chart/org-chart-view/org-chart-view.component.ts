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
        expanded: true,
        type: 'person',
        styleClass: 'bg-indigo-500 text-white',
        data: {
            image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/amyelsner.png',
            name: 'Amy Elsner',
            title: 'CEO'
        },
        children: [
            {
                expanded: true,
                type: 'person',
                styleClass: 'bg-purple-500 text-white',
                data: {
                    image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/annafali.png',
                    name: 'Anna Fali',
                    title: 'CMO'
                },
                children: [
                    {
                        label: 'Sales',
                        styleClass: 'bg-purple-500 text-white',
                        style: ' border-radius: 12px'
                    },
                    {
                        label: 'Marketing',
                        styleClass: 'bg-purple-500 text-white',
                        style: ' border-radius: 12px'
                    }
                ]
            },
            {
                expanded: true,
                type: 'person',
                styleClass: 'bg-teal-500 text-white',
                data: {
                    image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/stephenshaw.png',
                    name: 'Stephen Shaw',
                    title: 'CTO'
                },
                children: [
                    {
                        label: 'Development',
                        styleClass: 'bg-teal-500 text-white'
                    },
                    {
                        label: 'UI/UX Design',
                        styleClass: 'bg-teal-500 text-white'
                    }
                ]
            }
        ]
    }
];
}
