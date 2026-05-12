import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { SupportEntryService } from '@app/core/services/support-entry.service';
import { MenuBadgeWebsocketService, SidebarMenuBadgeCounts } from '@app/core/services/menu-badge-websocket.service';
import { Subscription } from 'rxjs';

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  colorClass: string;
  route?: string;
}

interface MetricOption {
  key: keyof SidebarMenuBadgeCounts;
  label: string;
  group: string;
  icon: string;
  route: string;
  featured?: boolean;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  private readonly metricPrefsStorageKey = 'overview-selected-metrics-v1';
  private badgeCountsSubscription?: Subscription;
  private lastUpdateSubscription?: Subscription;

  readonly featuredActions: QuickAction[] = [
    {
      label: 'Support',
      description: 'Open one support form, then choose Dashboard/App or IT/Access.',
      icon: 'las la-life-ring',
      colorClass: 'text-warning',
    },
  ];

  // Featured = shown in primary chip row; others are in "More" dropdown
  readonly metricOptions: MetricOption[] = [
    // ── Primary (featured) ─────────────────────────────────────────────────
    { key: 'validationQueue',        label: 'MR Validation Queue',       group: 'Material Request',     icon: 'mdi mdi-clipboard-check-outline',  route: '/operations/material-request/validate-list', featured: true },
    { key: 'pickingQueue',           label: 'MR Picking Queue',          group: 'Material Request',     icon: 'mdi mdi-clipboard-list-outline',   route: '/operations/material-request/picking',       featured: true },
    { key: 'partsOrderOpen',         label: 'Parts Orders Open',         group: 'Field Service',        icon: 'mdi mdi-package-variant-closed',   route: '/operations/parts-order/list',               featured: true },
    { key: 'supportTicketsOpen',     label: 'Support Tickets Open',      group: 'Support',              icon: 'mdi mdi-lifebuoy',                 route: '/support-tickets',                           featured: true },
    { key: 'qualityIssuesOpen',      label: 'Quality Issues Open',       group: 'Quality',              icon: 'mdi mdi-alert-circle-outline',     route: '/quality/qir',                               featured: true },
    { key: 'shippingRequestOpen',    label: 'Shipping Requests Open',    group: 'Shipping',             icon: 'mdi mdi-truck-fast-outline',       route: '/operations/forms/shipping-request',         featured: true },
    { key: 'shortagesOpen',          label: 'Shortages Open',            group: 'Operations',           icon: 'mdi mdi-alert-octagon-outline',    route: '/operations/shortages/list',                 featured: true },
    { key: 'safetyIncidentOpen',     label: 'Safety Incidents Open',     group: 'Safety',               icon: 'mdi mdi-shield-alert-outline',     route: '/operations/forms/safety-incident/list',     featured: true },
    // ── More ───────────────────────────────────────────────────────────────
    { key: 'fieldsServiceRequestsOpen',           label: 'Field Service Requests Open',       group: 'Field Service',        icon: 'mdi mdi-account-hard-hat',         route: '/field-service/request/list' },
    { key: 'supportMyTicketsOpen',                label: 'My Support Tickets',                group: 'Support',              icon: 'mdi mdi-account-alert-outline',    route: '/support-tickets/my-tickets' },
    { key: 'returnsRmaOpen',                      label: 'RMA Open',                          group: 'Quality',              icon: 'mdi mdi-refresh',                  route: '/quality/rma/list' },
    { key: 'correctiveActionsOpen',               label: 'Corrective Actions Open',           group: 'Quality',              icon: 'mdi mdi-check-circle-outline',     route: '/quality/car/list' },
    { key: 'permitChecklistOpen',                 label: 'Permit Checklists Open',            group: 'Quality',              icon: 'mdi mdi-file-document-outline',    route: '/quality/permit-checklists' },
    { key: 'pmProjectsOpen',                      label: 'PM Projects Open',                  group: 'Project Management',   icon: 'mdi mdi-briefcase-outline',        route: '/project-manager/dashboard' },
    { key: 'pmTasksOpen',                         label: 'PM Tasks Open',                     group: 'Project Management',   icon: 'mdi mdi-format-list-checks',       route: '/project-manager/tasks' },
    { key: 'vehicleExpiringSoon',                 label: 'Vehicles Expiring Soon',            group: 'Safety',               icon: 'mdi mdi-car-clock',                route: '/operations/forms/vehicle-inspection' },
    { key: 'vehicleInspectionPendingResolutions', label: 'Vehicle Insp. Pending Resolution',  group: 'Safety',               icon: 'mdi mdi-car-wrench',               route: '/operations/forms/vehicle-inspection/list?selectedViewType=Open&showPending=true' },
    { key: 'pickAndStageOpen',                    label: 'Pick & Stage Open',                 group: 'Production',           icon: 'mdi mdi-package-up',               route: '/operations/master-scheduling/picking-routing' },
    { key: 'productionRoutingOpen',               label: 'Production Routing Open',           group: 'Production',           icon: 'mdi mdi-factory',                  route: '/operations/master-scheduling/production-routing' },
    { key: 'finalTestQcOpen',                     label: 'Final Test / QC Open',              group: 'Production',           icon: 'mdi mdi-clipboard-text-search',    route: '/operations/master-scheduling/qc-routing' },
    { key: 'shippingScheduleDueNow',              label: 'Overdue & Due Today',               group: 'Shipping',             icon: 'mdi mdi-calendar-clock',           route: '/operations/forms/shipping-schedule' },
    { key: 'graphicsProductionOpen',              label: 'Graphics Production Open',          group: 'Operations',           icon: 'mdi mdi-palette-outline',          route: '/operations/graphics/graphics-production' },
    { key: 'trainingLiveSessionsOpen',            label: 'Training Live Sessions',            group: 'Training',             icon: 'mdi mdi-school-outline',           route: '/training/live' },
    { key: 'inspectionChecklistExecutionInProgress', label: 'Inspections In Progress',        group: 'Quality',              icon: 'mdi mdi-clipboard-check',          route: '/inspection-checklist/execution' },
  ];

  readonly defaultSelectedMetricKeys: Array<keyof SidebarMenuBadgeCounts> = [
    'validationQueue',
    'pickingQueue',
    'partsOrderOpen',
    'supportTicketsOpen',
    'qualityIssuesOpen',
    'shippingRequestOpen',
  ];

  selectedMetricKeys = new Set<keyof SidebarMenuBadgeCounts>(this.defaultSelectedMetricKeys);
  showMoreMetrics = false;
  lastUpdateTime: Date = new Date();
  menuBadgeCounts: SidebarMenuBadgeCounts = {
    validationQueue: 0,
    pickingQueue: 0,
    pickAndStageOpen: 0,
    productionRoutingOpen: 0,
    finalTestQcOpen: 0,
    shippingScheduleDueNow: 0,
    vehicleExpiringSoon: 0,
    vehicleInspectionPendingResolutions: 0,
    shortagesOpen: 0,
    safetyIncidentOpen: 0,
    qualityIssuesOpen: 0,
    correctiveActionsOpen: 0,
    returnsRmaOpen: 0,
    permitChecklistOpen: 0,
    shippingRequestOpen: 0,
    graphicsProductionOpen: 0,
    fieldsServiceRequestsOpen: 0,
    partsOrderOpen: 0,
    trainingLiveSessionsOpen: 0,
    inspectionChecklistExecutionInProgress: 0,
    pmProjectsOpen: 0,
    pmTasksOpen: 0,
    supportTicketsOpen: 0,
    supportMyTicketsOpen: 0,
  };

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private supportEntryService: SupportEntryService,
    private menuBadgeWebsocketService: MenuBadgeWebsocketService,
  ) {}

  ngOnInit(): void {
    this.loadMetricPreferences();
    this.menuBadgeWebsocketService.init();
    this.badgeCountsSubscription = this.menuBadgeWebsocketService.counts$.subscribe((counts) => {
      this.menuBadgeCounts = counts;
    });
    this.lastUpdateSubscription = this.menuBadgeWebsocketService.lastUpdate$.subscribe((time) => {
      this.lastUpdateTime = time;
    });
  }

  ngOnDestroy(): void {
    this.badgeCountsSubscription?.unsubscribe();
    this.lastUpdateSubscription?.unsubscribe();
  }

  openSupportAction(): void {
    void this.supportEntryService.openSupport({ source: 'overview' });
  }

  get selectedMetricOptions(): MetricOption[] {
    return this.metricOptions.filter((metric) => this.selectedMetricKeys.has(metric.key));
  }

  get featuredMetricOptions(): MetricOption[] {
    return this.metricOptions.filter((m) => m.featured);
  }

  get moreMetricOptions(): MetricOption[] {
    return this.metricOptions.filter((m) => !m.featured);
  }

  get moreSelectedCount(): number {
    return this.moreMetricOptions.filter((m) => this.selectedMetricKeys.has(m.key)).length;
  }

  isMetricSelected(key: keyof SidebarMenuBadgeCounts): boolean {
    return this.selectedMetricKeys.has(key);
  }

  toggleMetric(key: keyof SidebarMenuBadgeCounts): void {
    if (this.selectedMetricKeys.has(key)) {
      this.selectedMetricKeys.delete(key);
    } else {
      this.selectedMetricKeys.add(key);
    }

    if (this.selectedMetricKeys.size === 0) {
      this.selectedMetricKeys.add(this.defaultSelectedMetricKeys[0]);
    }

    this.saveMetricPreferences();
  }

  resetMetricPreferences(): void {
    this.selectedMetricKeys = new Set<keyof SidebarMenuBadgeCounts>(this.defaultSelectedMetricKeys);
    this.saveMetricPreferences();
  }

  getMetricCount(metricKey: keyof SidebarMenuBadgeCounts): number {
    return Number(this.menuBadgeCounts?.[metricKey] ?? 0);
  }

  openMetric(metric: MetricOption): void {
    if (!metric.route) {
      return;
    }

    void this.router.navigateByUrl(metric.route);
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 30) return 'just now';
    if (diffMins < 1) return 'less than a minute ago';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  private loadMetricPreferences(): void {
    try {
      const raw = localStorage.getItem(this.metricPrefsStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as string[];
      const allowedKeys = new Set(this.metricOptions.map((item) => item.key));
      const validKeys = parsed.filter((key): key is keyof SidebarMenuBadgeCounts =>
        allowedKeys.has(key as keyof SidebarMenuBadgeCounts),
      );

      if (validKeys.length > 0) {
        this.selectedMetricKeys = new Set<keyof SidebarMenuBadgeCounts>(validKeys);
      }
    } catch {
      this.selectedMetricKeys = new Set<keyof SidebarMenuBadgeCounts>(this.defaultSelectedMetricKeys);
    }
  }

  private saveMetricPreferences(): void {
    const selected = Array.from(this.selectedMetricKeys);
    localStorage.setItem(this.metricPrefsStorageKey, JSON.stringify(selected));
  }
}
