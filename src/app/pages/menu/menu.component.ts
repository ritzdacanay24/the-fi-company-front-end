import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { PathUtilsService } from "@app/core/services/path-utils.service";
import { environment } from "@environments/environment";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-menu",
  templateUrl: "./menu.component.html",
  styleUrls: [],
})
export class MenuComponent implements OnInit {
  constructor(
    public route: ActivatedRoute, 
    public router: Router,
    private pathUtils: PathUtilsService
  ) {}

  ngOnInit(): void {}

  data = [
    {
      name: "Las Vegas",
      children: [
        { name: "Operations Dashboard", link: "/operations" },
        { name: "Field Service Dashboard", link: "/field-service" },
        { name: "Quality Dashboard", link: "/quality" },
        {
          name: "Shipping Request Form",
          link: "/operations/forms/shipping-request/create",
        },
        { name: "Field Service Request Form", link: "/request" },
        {
          name: "Quality Incident Request Form",
          link: "/quality-incident-request",
        },
        {
          name: "Forms",
          link: "/forms",
        },
        {
          name: "Safety Incident Form",
          link: "/operations/forms/safety-incident/create",
        },
        {
          name: "FS App",
          link: "https://dashboard.eye-fi.com/dist/fsm-mobile/assignments",
        },
        { name: "MRO", link: "https://mro.swstms.com/users/sign_in" },
        { name: "Org Chart", link: "/operations/org-chart/org-chart-view" },
      ],
    },
    {
      name: "TJ",
      children: [{ name: "SouthFi", link: "https://portal.southfi-apps.com/" }],
    },
  ];

  isLink(row) {
    if (row.name == "SouthFi") {
      window.open(row.link, row.name, "height=800,width=800");

    } else if (row.link?.includes("https")) {
      window.open(row.link, "_blank");
    } else {
      let link = row.link;
      if (environment.production) {
        link = this.pathUtils.buildUrl(row.link);
      } else {
        link = row.link;
      }

      window.open(link, "_blank");
    }
  }
}
