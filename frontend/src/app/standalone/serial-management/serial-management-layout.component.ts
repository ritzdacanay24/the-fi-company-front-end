import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StandaloneLayoutThemeService } from '@app/standalone/shared/standalone-layout-theme.service';
import { StandaloneSidenavComponent, StandaloneSidenavGroup } from '@app/standalone/shared/standalone-sidenav.component';

interface MainSectionItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-serial-management-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, StandaloneSidenavComponent],
  templateUrl: './serial-management-layout.component.html',
  styleUrl: './serial-management-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SerialManagementLayoutComponent implements OnInit {
  currentSectionLabel = 'UL Labels';
  isSidebarOpen = false;

  readonly mainSections: MainSectionItem[] = [
    { label: 'Operations', route: '/operations', icon: 'las la-cogs' },
    { label: 'Quality', route: '/quality', icon: 'las la-clipboard-check' },
    { label: 'Field Service', route: '/field-service', icon: 'las la-tools' },
    { label: 'Admin', route: '/admin', icon: 'las la-user-shield' },
  ];

  readonly navGroups: StandaloneSidenavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', route: '/serial-management/dashboard', icon: 'mdi mdi-view-dashboard-outline' },
      ],
    },
    {
      title: 'UL Management',
      items: [
        { label: 'Labels Inventory', route: '/serial-management/ul-labels', icon: 'mdi mdi-certificate' },
        { label: 'UL Usage Report', route: '/serial-management/ul-usage', icon: 'mdi mdi-chart-line' },
        { label: 'UL Audit Sign-Off', route: '/serial-management/ul-audit-signoff', icon: 'mdi mdi-clipboard-check-outline' },
        { label: 'UL Audit History', route: '/serial-management/ul-audit-history', icon: 'mdi mdi-history' },
        { label: 'Upload UL Labels', route: '/serial-management/ul-upload', icon: 'mdi mdi-upload' },
      ],
    },
    {
      title: 'IGT',
      items: [
        { label: 'IGT Inventory', route: '/serial-management/igt-inventory', icon: 'mdi mdi-chip' },
        { label: 'IGT Usage Report', route: '/serial-management/igt-usage', icon: 'mdi mdi-chart-bar' },
        { label: 'Upload IGT Serials', route: '/serial-management/igt-upload', icon: 'mdi mdi-upload' },
      ],
    },
    {
      title: 'AGS / SG Asset',
      items: [
        { label: 'AGS Serial Control', route: '/serial-management/ags-serial', icon: 'las la-barcode' },
        { label: 'SG Asset Control', route: '/serial-management/sg-asset', icon: 'las la-boxes' },
      ],
    },
    {
      title: 'EyeFi Serials',
      items: [
        { label: 'EyeFi Inventory', route: '/serial-management/eyefi-serials', icon: 'las la-microchip' },
        { label: 'EyeFi Usage Report', route: '/serial-management/eyefi-serials/usage-report', icon: 'mdi mdi-chart-line' },
        { label: 'Upload EyeFi Serials', route: '/serial-management/eyefi-serials/upload', icon: 'mdi mdi-upload' },
      ],
    },
    {
      title: 'Unique Label Generator',
      items: [
        { label: 'Generate Labels', route: '/serial-management/ul-generator/create', icon: 'mdi mdi-label-outline' },
        { label: 'History', route: '/serial-management/ul-generator/history', icon: 'mdi mdi-history' },
        { label: 'Reports', route: '/serial-management/ul-generator/reports', icon: 'mdi mdi-chart-bar' },
        { label: 'Admin', route: '/serial-management/ul-generator/admin', icon: 'mdi mdi-shield-account-outline' },
      ],
    },
    {
      title: 'Assignments',
      items: [
        { label: 'Serial Assignments', route: '/serial-management/serial-assignments', icon: 'las la-clipboard-list' },
      ],
    },
  ];

  get isDesktopViewport(): boolean {
    return window.innerWidth >= 992;
  }

  constructor(
    private readonly router: Router,
    private readonly standaloneLayoutThemeService: StandaloneLayoutThemeService,
  ) {
    this.syncSidebarForViewport();
    this.updateSectionLabel(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEvent = event as NavigationEnd;
        this.updateSectionLabel(navEvent.urlAfterRedirects);
        if (!this.isDesktopViewport) {
          this.isSidebarOpen = false;
        }
      });
  }

  ngOnInit(): void {
    this.standaloneLayoutThemeService.applyThemeLayoutAttributes();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncSidebarForViewport();
  }

  private syncSidebarForViewport(): void {
    this.isSidebarOpen = this.isDesktopViewport;
  }

  private updateSectionLabel(url: string): void {
    const all = this.navGroups.flatMap((g) => g.items);
    const matched = all.find((item) => url.startsWith(item.route));
    this.currentSectionLabel = matched?.label ?? 'Serial Management';
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  onNavClick(): void {
    if (!this.isDesktopViewport) {
      this.isSidebarOpen = false;
    }
  }

  isMainSectionActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
