import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SupportEntryService } from '@app/core/services/support-entry.service';
import { SharedModule } from '@app/shared/shared.module';

interface FormLink {
  label: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-forms-launcher',
  templateUrl: './forms-launcher.component.html',
  styleUrls: [],
})
export class FormsLauncherComponent {
  forms: FormLink[] = [
    { label: 'EyeFi Serial Workflow', icon: 'mdi mdi-vector-combine',        route: '/standalone/eyefi-workflow',                   color: 'text-primary' },
    { label: 'QIR',              icon: 'mdi mdi-alert-circle-outline',  route: '/quality/qir/create',                          color: 'text-danger'  },
    { label: 'RMA',              icon: 'mdi mdi-refresh',               route: '/quality/rma/create',                          color: 'text-warning' },
    { label: 'Safety Incident',  icon: 'mdi mdi-shield-alert',          route: '/operations/forms/safety-incident/create',     color: 'text-danger'  },
    { label: 'Shipping Request', icon: 'mdi mdi-truck-delivery',        route: '/operations/forms/shipping-request/create',    color: 'text-primary' },
    { label: 'IGT Transfer',     icon: 'mdi mdi-swap-horizontal',       route: '/operations/forms/igt-transfer/create',        color: 'text-info'    },
    { label: 'Parts Order',      icon: 'mdi mdi-package-variant-closed', route: '/operations/parts-order/create',              color: 'text-success' },
    { label: 'Material Request', icon: 'mdi mdi-clipboard-list',        route: '/operations/material-request/create',          color: 'text-primary' },
    { label: 'RFQ',              icon: 'mdi mdi-file-document',         route: '/operations/forms/rfq/create',                 color: 'text-secondary'},
    { label: 'Placard',          icon: 'mdi mdi-card-text',             route: '/operations/forms/placard/create',             color: 'text-dark'    },
    { label: 'Forklift Insp.',   icon: 'mdi mdi-forklift',              route: '/operations/forms/forklift-inspection/create', color: 'text-warning' },
    { label: 'Vehicle Insp.',    icon: 'mdi mdi-car-wrench',            route: '/operations/forms/vehicle-inspection/create',  color: 'text-secondary'},
    { label: 'Training',         icon: 'mdi mdi-school',                route: '/training/setup',                              color: 'text-primary'  },
    { label: 'Support',          icon: 'mdi mdi-ticket-outline',        route: '/support-tickets',                            color: 'text-warning'  },
  ];

  constructor(
    private router: Router,
    private supportEntryService: SupportEntryService,
  ) {}

  navigate(route: string) {
    if (route === '/support-tickets') {
      void this.supportEntryService.openSupport({ source: 'quick-forms' });
      return;
    }

    this.router.navigateByUrl(route);
  }
}
