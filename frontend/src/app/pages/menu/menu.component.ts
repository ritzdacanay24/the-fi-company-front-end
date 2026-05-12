import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { PathUtilsService } from "@app/core/services/path-utils.service";
import { environment } from "@environments/environment";
import { SupportEntryService } from "@app/core/services/support-entry.service";
import { AuthenticationService } from "@app/core/services/auth.service";

interface MenuItem {
  name: string;
  link: string;
  icon: string;
  color: string;
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-menu",
  templateUrl: "./menu.component.html",
  styleUrls: ["./menu.component.scss"],
})
export class MenuComponent implements OnInit {
  constructor(
    public route: ActivatedRoute, 
    public router: Router,
    private pathUtils: PathUtilsService,
    private supportEntryService: SupportEntryService,
    private authService: AuthenticationService,
  ) {}

  ngOnInit(): void {}

  goToMainApp(): void {
    this.router.navigate(['/operations']);
  }

  logoutSession(): void {
    this.authService.logout().subscribe();
    localStorage.removeItem('temp_session_start');
    this.router.navigate(['/auth/login']);
  }

  data: MenuSection[] = [
    {
      section: 'Dashboards',
      items: [
        { name: 'Dashboard',           link: '/operations',    icon: 'las la-tachometer-alt', color: 'text-primary'   },
        { name: 'Field Service',        link: '/field-service', icon: 'las la-tools',          color: 'text-success'   },
      ]
    },
    {
      section: 'Forms',
      items: [
        { name: 'EyeFi Serial Workflow',   link: '/standalone/eyefi-workflow',     icon: 'las la-barcode',          color: 'text-primary'   },
        { name: 'Shipping Request',        link: '/operations/forms/shipping-request/create',     icon: 'las la-shipping-fast',    color: 'text-info'      },
        { name: 'Safety Incident',         link: '/safety-incident-public/create',                 icon: 'las la-shield-alt',       color: 'text-danger'    },
        { name: 'Field Service Request',   link: '/request',                                      icon: 'las la-clipboard',        color: 'text-success'   },
        { name: 'Quality Incident (QIR)',  link: '/quality-incident-request',                     icon: 'las la-exclamation-triangle', color: 'text-warning'},
        { name: 'IGT Transfer',            link: '/operations/forms/igt-transfer/create',         icon: 'las la-exchange-alt',     color: 'text-info'      },
        { name: 'Parts Order',             link: '/operations/parts-order/create',                icon: 'las la-box',              color: 'text-success'   },
        { name: 'Material Request',        link: '/operations/material-request/create',           icon: 'las la-clipboard-list',   color: 'text-primary'   },
        { name: 'RFQ',                     link: '/operations/forms/rfq/create',                  icon: 'las la-file-alt',         color: 'text-secondary' },
        { name: 'RMA',                     link: '/quality/rma/create',                           icon: 'las la-undo-alt',         color: 'text-warning'   },
        { name: 'Placard',                 link: '/operations/forms/placard/create',              icon: 'las la-tag',              color: 'text-dark'      },
        { name: 'Forklift Inspection',     link: '/operations/forms/forklift-inspection/create',  icon: 'las la-truck-loading',    color: 'text-warning'   },
        { name: 'Vehicle Inspection',      link: '/operations/forms/vehicle-inspection/create',   icon: 'las la-car',              color: 'text-secondary' },
        { name: 'Training',                link: '/training/setup',                               icon: 'las la-graduation-cap',   color: 'text-primary'   },
      ]
    },
    {
      section: 'Apps & Tools',
      items: [
        { name: 'FS App',    link: 'https://dashboard.eye-fi.com/dist/fsm-mobile/assignments', icon: 'las la-mobile-alt', color: 'text-primary'  },
        { name: 'MRO',       link: 'https://mro.swstms.com/users/sign_in',                    icon: 'las la-wrench',     color: 'text-secondary'},
        { name: 'Labels',    link: '/operations/labels/list',                                  icon: 'las la-tags',       color: 'text-info'     },
      ]
    },
  ];

  openSupport(): void {
    void this.supportEntryService.openSupport({ source: 'menu' });
  }

  isLink(row: MenuItem): void {
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
